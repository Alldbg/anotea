const getOrganismeEmail = require('../../utils/getOrganismeEmail');

module.exports = (db, mailer) => {

    return (organisme, options = {}) => {
        return new Promise((resolve, reject) => {
            mailer.sendOrganisationAccountLink({ to: getOrganismeEmail(organisme) }, organisme,
                async () => {
                    await db.collection('organismes').update({ '_id': organisme._id }, {
                        $set: {
                            mailSentDate: new Date(),
                            resent: true
                        },
                        $unset: {
                            mailError: '',
                            mailErrorDetail: ''
                        },
                    });

                    await db.collection('events').insertOne({
                        app: 'moderation',
                        profile: 'moderateur',
                        user: 'admin',
                        ip: options.ip,
                    });

                    resolve();
                },
                err => reject(new Error(err)));
        });
    };
};