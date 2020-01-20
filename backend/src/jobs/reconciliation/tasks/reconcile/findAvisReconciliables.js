const asSiren = require('../../../../core/utils/asSiren');

const getDepartement = codePostal => codePostal.substring(0, 2);

module.exports = async (db, intercarif, action) => {

    let adresse = action.lieu_de_formation.coordonnees.adresse;
    let siret = action.organisme_formateur.siret_formateur.siret;

    let avis = await db.collection('avis').find({
        'training.organisation.siret': new RegExp(`^${asSiren(siret)}`),
        'status': { $in: ['validated', 'rejected'] },
        '$and': [
            {
                '$or': [
                    { 'training.certifInfos': { $in: intercarif._meta.certifinfos } },
                    { 'training.formacodes': { $in: intercarif._meta.formacodes } },
                ]

            },
            {
                '$or': [
                    {
                        'training.place.postalCode': adresse.codepostal,
                    },
                    {
                        $and: [
                            {
                                'training.place.postalCode': {
                                    $not: /^(75|690|130)/
                                }
                            },
                            {
                                'training.place.postalCode': {
                                    $regex: new RegExp(`^${getDepartement(adresse.codepostal)}`)
                                },
                                'training.place.city': adresse.ville,
                            },
                        ]
                    }
                ]

            }
        ],
    })
    .project({
        _id: 1,
        token: 1,
        training: 1,
        notes: 1,
        date: 1,
        codeFinanceur: 1,
        commentaire: 1,
        status: 1,
        reponse: 1,
        codeRegion: 1,
    })
    .toArray();

    let certifiants = avis.filter(a => {
        return !!a.training.certifInfos.find(c => intercarif._meta.certifinfos.includes(c));
    });

    return { action, avis: certifiants.length > 0 ? certifiants : avis };
};
