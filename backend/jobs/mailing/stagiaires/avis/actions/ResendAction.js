const moment = require('moment');

class ResendAction {

    constructor(configuration, filters = {}) {
        this.configuration = configuration;
        this.filters = filters;
    }

    getQuery() {
        let { avisRelaunchDelay, avisMaxRelaunch } = this.configuration.smtp.stagiaires;

        return {
            mailSent: true,
            unsubscribe: false,
            tracking: { $eq: null },
            $and: [
                { mailSentDate: { $lte: moment().subtract(avisRelaunchDelay, 'days').toDate() } },
                { mailSentDate: { $gte: moment().subtract(1, 'years').toDate() } },
            ],
            ...(this.filters.codeRegions ? { codeRegion: { $in: this.filters.codeRegions } } : {}),
            ...(this.filters.campaign ? { campaign: this.filters.campaign } : {}),
            $or: [
                { mailRetry: { $eq: null } },
                { mailRetry: { $lt: parseInt(avisMaxRelaunch) } }
            ]
        };
    }
}

module.exports = ResendAction;