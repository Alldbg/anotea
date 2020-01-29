const fs = require('fs');
const bz2 = require('unbzip2-stream');
const md5File = require('md5-file/promise');
const md5 = require('md5');
const validateStagiaire = require('./utils/validateStagiaire');
const { transformObject, writeObject, ignoreFirstLine, pipeline, parseCSV } = require('../../../../core/utils/stream-utils');
const { getCampaignDate, getCampaignName, sanitizeCsvLine } = require('./utils/utils');

module.exports = async (db, logger, file, handler, filters = {}, options = {}) => {

    let hash = await md5File(file);
    let campaign = {
        name: getCampaignName(file),
        date: getCampaignDate(file),
    };

    const isFiltered = stagiaire => {
        if (filters.codeRegion) {
            return filters.codeRegion === stagiaire.codeRegion;
        }
        if (filters.codeFinanceur) {
            return stagiaire.formation.action.organisme_financeurs.map(o => o.code_financeur).includes(filters.codeFinanceur);
        }
        return true;
    };

    const hasNotBeenAlreadyImportedOrRemoved = async stagiaire => {
        let email = stagiaire.individu.email;
        let [countStagiaires, countOptOut] = await Promise.all([
            db.collection('stagiaires').countDocuments({ refreshKey: stagiaire.refreshKey }),
            db.collection('optOut').countDocuments({ md5: md5(email) })
        ]);

        return countStagiaires === 0 && countOptOut === 0;
    };


    let stats = {
        total: 0,
        imported: 0,
        ignored: 0,
        invalid: 0,
    };

    if (await db.collection('jobs').findOne({ campaign: campaign.name })) {
        logger.info(`CSV file ${file} already imported`);
        return stats;
    }

    await pipeline([
        fs.createReadStream(file),
        ...(options.unpack ? [bz2()] : []),
        parseCSV(handler.csvOptions),
        ignoreFirstLine(),
        transformObject(sanitizeCsvLine),
        writeObject(async record => {
            try {
                stats.total++;
                let stagiaire = await handler.buildStagiaire(record, campaign);

                if (isFiltered(stagiaire) && handler.shouldBeImported(stagiaire) &&
                    await hasNotBeenAlreadyImportedOrRemoved(stagiaire)) {

                    await validateStagiaire(stagiaire);
                    await db.collection('stagiaires').insertOne(stagiaire);
                    stats.imported++;
                    logger.debug('New stagiaire inserted');
                } else {
                    stats.ignored++;
                    logger.debug('Stagiaire ignored', stagiaire, {});
                }
            } catch (e) {
                stats.invalid++;
                logger.error(`Stagiaire cannot be imported`, record, e);
            }
        }, { parallel: 25 })
    ]);

    await db.collection('jobs').insertOne({
        type: 'import-stagiaires',
        hash,
        campaign: campaign.name,
        campaignDate: campaign.date,
        file,
        filters,
        stats: stats,
        date: new Date(),
    });

    return stats;
};