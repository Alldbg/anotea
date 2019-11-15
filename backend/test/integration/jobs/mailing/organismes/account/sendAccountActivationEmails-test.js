const assert = require('assert');
const configuration = require('config');
const moment = require('moment');
const { withMongoDB } = require('../../../../../helpers/with-mongodb');
const { newOrganismeAccount } = require('../../../../../helpers/data/dataset');
const logger = require('../../../../../helpers/components/fake-logger');
const sendAccountActivationEmails = require('../../../../../../src/jobs/mailing/organismes/account/tasks/sendAccountActivationEmails');
const SendAction = require('../../../../../../src/jobs/mailing/organismes/account/tasks/actions/SendAction');
const ResendAction = require('../../../../../../src/jobs/mailing/organismes/account/tasks/actions/ResendAction');
const accountActivationEmail = require('../../../../../../src/common/components/emails/accountActivationEmail');
const fakeMailer = require('../../../../../helpers/components/fake-new-mailer');

describe(__filename, withMongoDB(({ getTestDatabase, insertIntoDatabase, getComponents }) => {

    let dummyAction = {
        getQuery: () => ({}),
    };

    let fakeEmailCreator = async (mailerOptions = {}) => {
        let db = await getTestDatabase();
        let { regions, templates } = await getComponents();

        let mailer = fakeMailer(mailerOptions);
        return accountActivationEmail(db, regions, mailer, templates);
    };

    it('should send email by siret', async () => {

        let db = await getTestDatabase();
        let emailsSent = [];
        await Promise.all([
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: 31705038300064,
                SIRET: 31705038300064,
                courriel: 'new@organisme.fr',
                score: {
                    nb_avis: 1,
                },
                meta: {
                    siretAsString: `${31705038300064}`,
                },
            })),
        ]);

        let results = await sendAccountActivationEmails(db, logger, await fakeEmailCreator({ calls: emailsSent }), dummyAction, {
            siret: '31705038300064'
        });

        assert.deepStrictEqual(results, {
            total: 1,
            sent: 1,
            error: 0,
        });
        assert.strictEqual(emailsSent[0].email, 'new@organisme.fr');
        assert.strictEqual(emailsSent[0].message.subject, 'Pôle Emploi vous donne accès aux avis de vos stagiaires');
    });

    it('should send emails', async () => {

        let db = await getTestDatabase();
        let emailsSent = [];
        await insertIntoDatabase('accounts', newOrganismeAccount({ courriel: 'new@organisme.fr' }));

        let results = await sendAccountActivationEmails(db, logger, await fakeEmailCreator({ calls: emailsSent }), dummyAction);

        assert.deepStrictEqual(results, {
            total: 1,
            sent: 1,
            error: 0,
        });
        assert.strictEqual(emailsSent[0].email, 'new@organisme.fr');
        assert.strictEqual(emailsSent[0].message.subject, 'Pôle Emploi vous donne accès aux avis de vos stagiaires');
    });

    it('should update organisme when mailer succeed', async () => {

        let db = await getTestDatabase();
        await insertIntoDatabase('accounts', newOrganismeAccount({
            courriel: 'new@organisme.fr',
            mailSentDate: null
        }));

        await sendAccountActivationEmails(db, logger, await fakeEmailCreator(), dummyAction);

        let organisme = await db.collection('accounts').findOne({ courriel: 'new@organisme.fr' });
        assert.ok(organisme.mailSentDate);
        assert.deepStrictEqual(organisme.resend, false);
        assert.deepStrictEqual(organisme.mailError, undefined);
        assert.deepStrictEqual(organisme.mailErrorDetail, undefined);
    });

    it('should update set resend property to true on resend', async () => {

        let db = await getTestDatabase();
        await insertIntoDatabase('accounts', newOrganismeAccount({
            courriel: 'new@organisme.fr',
            mailSentDate: new Date()
        }));

        await sendAccountActivationEmails(db, logger, await fakeEmailCreator(), dummyAction);

        let organisme = await db.collection('accounts').findOne({ courriel: 'new@organisme.fr' });
        assert.deepStrictEqual(organisme.resend, true);
    });


    it('should update organisme when mailer fails', async () => {

        let db = await getTestDatabase();
        await insertIntoDatabase('accounts', newOrganismeAccount({ courriel: 'new@organisme.fr' }));

        try {
            await sendAccountActivationEmails(db, logger, await fakeEmailCreator({ fail: true }), dummyAction);
            assert.fail();
        } catch (e) {
            let organisme = await db.collection('accounts').findOne({ courriel: 'new@organisme.fr' });
            assert.deepStrictEqual(organisme.mailError, 'smtpError');
            assert.deepStrictEqual(organisme.mailErrorDetail, 'Unable to send email');
        }
    });

    it('should send email to new organismes only (SendAction)', async () => {

        let db = await getTestDatabase();
        let id = 31705038300064;
        let emailsSent = [];
        let action = new SendAction(configuration);
        await Promise.all([
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: id,
                SIRET: id,
                courriel: 'new@organisme.fr',
                meta: {
                    nbAvis: 1,
                    siretAsString: `${id}`,
                },
                passwordHash: null,
                mailSentDate: null,
                sources: ['intercarif'],
            })),
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: 11111111111,
                SIRET: 11111111111,
                courriel: 'not-sent@organisme.fr',
                meta: {
                    nbAvis: 1,
                    siretAsString: `11111111111`,
                },
                passwordHash: '12345',
                mailSentDate: null,
                sources: ['intercarif'],
            })),
        ]);

        let results = await sendAccountActivationEmails(db, logger, await fakeEmailCreator({ calls: emailsSent }), action);

        assert.deepStrictEqual(results, {
            total: 1,
            sent: 1,
            error: 0,
        });
        assert.strictEqual(emailsSent[0].email, 'new@organisme.fr');
    });

    it('should send email only to organismes in active regions (SendAction)', async () => {

        let db = await getTestDatabase();
        let emailsSent = [];
        await Promise.all([
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: 11111111111,
                SIRET: 11111111111,
                courriel: 'not-sent@organisme.fr',
                meta: {
                    nbAvis: 1,
                    siretAsString: `11111111111`,
                },
                passwordHash: null,
                mailSentDate: null,
                sources: ['intercarif'],
                codeRegion: 'XX',
            })),
        ]);

        let action = new SendAction(configuration, {
            codeRegions: ['11'],
        });
        let results = await sendAccountActivationEmails(db, logger, await fakeEmailCreator({ calls: emailsSent }), action);

        assert.deepStrictEqual(results, {
            total: 0,
            sent: 0,
            error: 0,
        });
    });

    it('should ignore organisme with email already resent (ResendAction)', async () => {

        let db = await getTestDatabase();
        let emailsSent = [];
        let action = new ResendAction(configuration);
        await Promise.all([
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: 31705038300064,
                SIRET: 31705038300064,
                courriel: 'new@organisme.fr',
                meta: {
                    siretAsString: `${31705038300064}`,
                },
                passwordHash: null,
                mailSentDate: moment().subtract('40', 'days').toDate(),
                sources: ['intercarif'],
            })),
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: 11111111111,
                SIRET: 11111111111,
                courriel: 'not-sent@organisme.fr',
                meta: {
                    siretAsString: `11111111111`,
                },
                passwordHash: '12345',
                mailSentDate: null,
                sources: ['intercarif'],
            })),
        ]);

        let results = await sendAccountActivationEmails(db, logger, await fakeEmailCreator({ calls: emailsSent }), action);

        assert.deepStrictEqual(results, {
            total: 1,
            sent: 1,
            error: 0,
        });
        assert.strictEqual(emailsSent[0].email, 'new@organisme.fr');
    });

    it('should ignore organisme with sent date lesser than relaunch delay (ResendAction)', async () => {

        let db = await getTestDatabase();
        let action = new ResendAction(configuration);
        await Promise.all([
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: 11111111111,
                SIRET: 11111111111,
                courriel: 'not-sent@organisme.fr',
                meta: {
                    siretAsString: `11111111111`,
                },
                passwordHash: '12345',
                mailSentDate: moment().subtract('1', 'days').toDate(),
                sources: ['intercarif'],
            })),
        ]);

        let results = await sendAccountActivationEmails(db, logger, await fakeEmailCreator(), action);

        assert.deepStrictEqual(results, {
            total: 0,
            sent: 0,
            error: 0,
        });
    });

    it('should ignore organisme with password already set (ResendAction)', async () => {

        let db = await getTestDatabase();
        let action = new ResendAction(configuration);
        await Promise.all([
            insertIntoDatabase('accounts', newOrganismeAccount({
                _id: 31705038300064,
                SIRET: 31705038300064,
                courriel: 'new@organisme.fr',
                meta: {
                    siretAsString: `${31705038300064}`,
                },
                passwordHash: '12345',
                mailSentDate: moment().subtract('40', 'days').toDate(),
                sources: ['intercarif'],
            })),
        ]);

        let results = await sendAccountActivationEmails(db, logger, await fakeEmailCreator(), action);

        assert.deepStrictEqual(results, {
            total: 0,
            sent: 0,
            error: 0,
        });
    });


}));
