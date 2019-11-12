const assert = require('assert');
const configuration = require('config');
const { withMongoDB } = require('../../../../../helpers/with-mongodb');
const { newTrainee, randomize } = require('../../../../../helpers/data/dataset');
const logger = require('../../../../../helpers/components/fake-logger');
const AvisMailer = require('../../../../../../src/jobs/mailing/stagiaires/avis/tasks/AvisMailer');
const RetryAction = require('../../../../../../src/jobs/mailing/stagiaires/avis/tasks/actions/RetryAction');
const fakeMailer = require('../../../../../helpers/components/fake-mailer');
const votreAvisEmail = require('../../../../../../src/common/components/emails/votreAvisEmail');

describe(__filename, withMongoDB(({ getTestDatabase, insertIntoDatabase, getComponents }) => {

    let createAvisMailer = async mailer => {
        let db = await getTestDatabase();
        let { regions } = await getComponents();

        let email = votreAvisEmail(db, mailer, configuration, regions);
        return new AvisMailer(db, logger, email);
    };

    it('should send email to trainee with smtp error', async () => {

        let mailer = fakeMailer();
        let id = randomize('trainee');
        let email = `${randomize('name')}@email.fr`;
        let avisMailer = await createAvisMailer(mailer);
        let action = new RetryAction(configuration);
        await Promise.all([
            insertIntoDatabase('trainee', newTrainee({
                _id: id,
                codeRegion: '18',
                mailSent: true,
                unsubscribe: false,
                mailError: 'smtpError',
                mailErrorDetail: 'An error occurred',
                mailRetry: 0,
                trainee: {
                    email: email,
                },
            })),
        ]);

        await avisMailer.sendEmails(action);

        assert.strictEqual(mailer.getLastEmailAddress(), email);
    });

}));
