const moment = require('moment');
const _ = require('lodash');
const config = require('config');
const fs = require('fs');
const { encodeStream } = require('iconv-lite');
const createComponents = require('../components');
const createLogger = require('../common/components/logger');
const { transformObject, csvStream } = require('../common/utils/stream-utils');
const { IncomingWebhook } = require('@slack/webhook');

module.exports = {
    delay: milliseconds => {
        return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
    },
    capitalizeFirstLetter: string => string.charAt(0).toUpperCase() + string.slice(1),
    flatten: array => [].concat.apply([], array),
    execute: async (job, options = {}) => {

        process.on('unhandledRejection', e => console.log(e));
        process.on('uncaughtException', e => console.log(e));

        let logger = createLogger('job', config);
        let components = await createComponents({ logger, configuration: config });
        const exit = async error => {
            if (error) {
                logger.error(error);
            }
            await logger.close();
            return components.client.close(() => {
                if (error) {
                    process.exitCode = 1;
                }
            });
        };

        let jobComponents = Object.assign({}, components, {
            exit,
            sendSlackNotification: message => {
                if (options.slack) {
                    let webhook = new IncomingWebhook(components.configuration.slack.webhookUrl);
                    return webhook.send(message);
                }
            }
        });

        try {
            let launchTime = new Date().getTime();
            let results = await job(jobComponents);

            let duration = moment.utc(new Date().getTime() - launchTime).format('HH:mm:ss.SSS');
            let data = {};
            if (results) {
                data = results.toJSON ? results.toJSON() : results;
                if (results.constructor === Array) {
                    data = results.map(r => r.toJSON ? r.toJSON() : r);
                }
            }
            logger.info({ type: 'script', ...data }, `Completed in ${duration}`);
            exit();
        } catch (e) {
            components.sentry.sendError(e);
            exit(e);
        }
    },
    csv: (inputStream, columns) => {
        return inputStream
        .pipe(csvStream(columns))
        .pipe(encodeStream('UTF-8'));
    },
    asPromise: stream => {
        return new Promise((resolve, reject) => {
            stream
            .on('error', e => reject(e))
            .on('finish', async () => resolve());
        });
    },
    promiseAll: async (promises, callback, options = { batchSize: 25 }) => {
        let chunks = _.chunk(promises, options.batchSize);
        for (let chunk of chunks) {
            await Promise.all(chunk.map(data => callback(data)));
        }
    }
};
