const assert = require('assert');
const configuration = require('config');
const { withMongoDB } = require('../../../../../helpers/with-mongodb');
const { newTrainee, randomize } = require('../../../../../helpers/data/dataset');
const logger = require('../../../../../helpers/components/fake-logger');
const AvisMailer = require('../../../../../../src/jobs/mailing/stagiaires/avis/tasks/AvisMailer');
const SendAction = require('../../../../../../src/jobs/mailing/stagiaires/avis/tasks/actions/SendAction');
const fakeMailer = require('../../../../../helpers/components/fake-mailer');
const votreAvisEmail = require('../../../../../../src/common/components/emails/votreAvisEmail');

describe(__filename, withMongoDB(({ getTestDatabase, insertIntoDatabase, getComponents }) => {

    let createAvisMailer = async mailer => {
        let db = await getTestDatabase();
        let { regions } = await getComponents();

        let email = votreAvisEmail(db, mailer, configuration, regions);
        return new AvisMailer(db, logger, email);
    };

    it('should send email to new trainee', async () => {

        let mailer = fakeMailer();
        let id = randomize('trainee');
        let email = `${randomize('name')}@email.fr`;
        let avisMailer = await createAvisMailer(mailer);
        let action = new SendAction(configuration);
        await Promise.all([
            insertIntoDatabase('trainee', newTrainee({
                _id: id,
                codeRegion: '11',
                sourceIDF: null,
                mailSent: false,
                unsubscribe: false,
                trainee: {
                    email: email,
                },
            })),
            insertIntoDatabase('trainee', newTrainee({
                codeRegion: '11',
                sourceIDF: null,
                mailSent: false,
                unsubscribe: true,
                trainee: {
                    email: 'not-sent@trainee.org',
                },
            })),
        ]);

        await avisMailer.sendEmails(action);

        assert.strictEqual(mailer.getLastEmailAddress(), email);
    });

    it('should ignore region', async () => {

        let mailer = fakeMailer();
        let avisMailer = await createAvisMailer(mailer);
        await Promise.all([
            insertIntoDatabase('trainee', newTrainee({
                codeRegion: 'XX',
                sourceIDF: null,
                mailSent: false,
                unsubscribe: false,
            })),
        ]);

        let handler = new SendAction(configuration, {
            codeRegions: ['11']
        });
        await avisMailer.sendEmails(handler);

        let calls = mailer.getCalls();
        assert.strictEqual(calls.length, 0);
    });
}));
