const config = require('config');
const auth = require('./common/components/auth');
const password = require('./common/components/password');
const deprecatedStats = require('./common/components/deprecatedStats');
const stats = require('./common/components/stats');
const getRegions = require('./common/components/regions');
const createLogger = require('./common/components/logger');
const sentry = require('./common/components/sentry');
const moderation = require('./common/components/moderation');
const database = require('./common/components/database');
const createMailer = require('./smtp/mailer');
const sendForgottenPasswordEmail = require('./common/components/mailing/sendForgottenPasswordEmail');
const sendOrganisationAccountEmail = require('./common/components/mailing/sendOrganisationAccountEmail');
const sendVotreAvisEmail = require('./common/components/mailing/sendVotreAvisEmail');
const sendReponseRejeteeNotification = require('./common/components/mailing/sendReponseRejeteeNotification');
const sendInjureMail = require('./common/components/mailing/sendInjureMail');

module.exports = async (options = {}) => {

    let configuration = options.configuration || config;
    let logger = options.logger || createLogger('backend', configuration);
    let { client, db } = await database(logger, configuration);
    let regions = getRegions();
    let mailer = options.mailer || createMailer(db, logger, configuration, regions);

    return Object.assign({}, {
        configuration,
        logger,
        db,
        client,
        mailer,
        sentry: sentry(logger, configuration),
        auth: auth(configuration),
        password,
        regions: regions,
        stats: stats(db, regions),
        deprecatedStats: deprecatedStats(db, regions),
        moderation: moderation(db, logger, mailer),
        mailing: {
            sendForgottenPasswordEmail: sendForgottenPasswordEmail(db, mailer),
            sendOrganisationAccountEmail: sendOrganisationAccountEmail(db, mailer),
            sendVotreAvisEmail: sendVotreAvisEmail(db, mailer),
            sendReponseRejeteeNotification: sendReponseRejeteeNotification(db, mailer, logger),
            sendInjureMail: sendInjureMail(db, mailer)
        }
    }, options || {});
};
