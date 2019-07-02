const uuid = require('node-uuid');
const getOrganismesResponsables = require('./intercarif/getOrganismesResponsables');
const findRegion = require('./intercarif/findRegion');
const { flatten } = require('../../job-utils');

module.exports = async (db, logger, regions) => {

    let stats = {
        total: 0,
        updated: 0,
        invalid: 0,
    };

    const synchronizeAccount = async organisme => {

        try {
            stats.total++;
            let region = findRegion(regions, organisme);

            let id = parseInt(organisme.siret, 10);

            let results = await db.collection('accounts').updateOne(
                { _id: id },
                {
                    $setOnInsert: {
                        _id: id,
                        profile: 'organisme',
                        SIRET: id,
                        raisonSociale: organisme.raison_sociale,
                        codeRegion: region.codeRegion,
                        courriel: organisme.courriel,
                        token: uuid.v4(),
                        creationDate: new Date(),
                        meta: {
                            siretAsString: organisme.siret,
                        }
                    },
                    $addToSet: {
                        ...(organisme.courriel ? { courriels: organisme.courriel } : {}),
                        sources: 'intercarif',
                    },
                    $set: {
                        numero: organisme.numero,
                        ...(!organisme.organisme_formateurs ? {} : {
                            organismeFormateurs: organisme.organisme_formateurs.map(of => {
                                return {
                                    siret: of.siret,
                                    numero: of.numero,
                                    raisonSociale: of.raison_sociale,
                                    lieux_de_formation: of.lieux_de_formation,
                                };
                            })
                        }),
                        lieux_de_formation: organisme.lieux_de_formation ? organisme.lieux_de_formation :
                            flatten(organisme.organisme_formateurs
                            .filter(of => of.siret === organisme.siret)
                            .map(of => of.lieux_de_formation)),
                    },
                },
                { upsert: true }
            );

            if (results.result.nModified === 1) {
                stats.updated++;
            }

        } catch (e) {
            stats.invalid++;
            logger.error(`Organisme cannot be synchronized with intercarif`, JSON.stringify(organisme, null, 2), e);
        }
    };

    let cursor = getOrganismesResponsables(db);
    while (await cursor.hasNext()) {
        const organisme = await cursor.next();

        await Promise.all([
            synchronizeAccount(organisme),
            ...organisme.organisme_formateurs.map(of => synchronizeAccount(of))
        ]);
    }

    return stats.invalid === 0 ? Promise.resolve(stats) : Promise.reject(stats);
};
