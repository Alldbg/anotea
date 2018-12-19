const express = require('express');
const Boom = require('boom');
const Joi = require('joi');
const tryAndCatch = require('../tryAndCatch');
const { verifyPassword, getSHA256PasswordHashSync, hashPassword } = require('../../../common/components/password');

module.exports = ({ db, authService, logger, configuration }) => {

    const router = express.Router(); // eslint-disable-line new-cap

    const getRemoteAddress = req => req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const logLoginEvent = (req, profile) => {
        return db.collection('events').insertOne({
            date: new Date(),
            type: 'log in',
            source: { user: req.body.username, profile, ip: getRemoteAddress(req) }
        });
    };

    const logLoginWithAccessTokenEvent = (req, organisme) => {
        return db.collection('events').insertOne({
            date: new Date(),
            type: 'login-access-token',
            source: {
                siret: organisme.meta.siretAsString,
                ip: getRemoteAddress(req)
            }
        });
    };

    const handleModerator = async (req, res, moderator) => {
        logLoginEvent(req, 'moderateur');
        return await authService.buildJWT('backoffice', {
            sub: req.body.username,
            profile: 'moderateur',
            id: moderator._id,
            codeRegion: moderator.codeRegion,
            features: moderator.features
        });
    };

    const handleOrganisme = async (req, res, organisme) => {
        logLoginEvent(req, 'organisme');
        return await authService.buildJWT('backoffice', {
            sub: organisme.meta.siretAsString,
            profile: 'organisme',
            id: organisme._id,
            codeRegion: organisme.codeRegion,
            raisonSociale: organisme.raisonSociale,
        });
    };

    const invalidateAuthToken = async (id, token) => {
        return db.collection('invalidAuthTokens').insertOne({
            subject: id,
            token,
            creationDate: new Date(),
        });
    };

    const isTokenAlreadyUsed = async (id, token) => {
        let count = await db.collection('invalidAuthTokens').countDocuments({
            subject: id,
            token,
        });
        return count > 0;
    };

    const handleFinancer = async (req, res, financer) => {
        let profile = 'financer';
        logLoginEvent(req, profile);
        return await authService.buildJWT('backoffice', {
            sub: req.body.username,
            profile: 'financer',
            id: financer._id,
            codeRegion: financer.codeRegion,
            codeFinanceur: financer.codeFinanceur
        });
    };

    const checkPassword = async (password, hash) => {
        let legacyHash = getSHA256PasswordHashSync(password, configuration);
        return await verifyPassword(password, hash) || await verifyPassword(legacyHash, hash);
    };

    const rehashPassword = async (type, account, password, propertyName = 'password') => {

        if (account.meta && account.meta.rehashed) {
            return Promise.resolve(account);
        }

        return db.collection(type).update({ _id: account._id }, {
            $set: {
                'meta.rehashed': true,
                [propertyName]: await hashPassword(password)
            }
        });
    };

    router.post('/backoffice/login', async (req, res) => {

        let identifier = req.body.username.toLowerCase();
        let password = req.body.password;
        let token;

        try {
            const moderator = await db.collection('moderator').findOne({ courriel: identifier });
            if (moderator !== null && await checkPassword(password, moderator.password)) {
                await rehashPassword('moderator', moderator, password);
                token = await handleModerator(req, res, moderator);
            }

            let organisme = await db.collection('organismes').findOne({ 'meta.siretAsString': identifier });
            if (organisme !== null && await checkPassword(password, organisme.passwordHash)) {
                await rehashPassword('organismes', organisme, password, 'passwordHash');
                token = await handleOrganisme(req, res, organisme);
            }

            const financer = await db.collection('financer').findOne({ courriel: identifier });
            if (financer !== null && await checkPassword(password, financer.password)) {
                await rehashPassword('financer', financer, password);
                token = await handleFinancer(req, res, financer);
            }

            if (token) {
                return res.status(200).send(token);
            } else {
                return res.status(400).send({ error: true });
            }

        } catch (e) {
            logger.error(`Unable to log in user ${identifier}`, e);
            return res.status(500).send({ error: true });
        }

    });

    router.get('/backoffice/login', tryAndCatch(async (req, res) => {

        const parameters = await Joi.validate(req.query, { access_token: Joi.string().required() }, { abortEarly: false });

        let user;
        try {
            user = await authService.checkJWT('backoffice', parameters.access_token);
        } catch (e) {
            throw Boom.badRequest('Token invalide', e);
        }

        let organisme = await db.collection('organismes').findOne({
            'meta.siretAsString': user.sub,
        });

        if (await isTokenAlreadyUsed(organisme._id, parameters.access_token)) {
            throw Boom.badRequest('Token déjà utilisé');
        }

        if (organisme !== null) {
            let [token] = await Promise.all([
                handleOrganisme(req, res, organisme),
                invalidateAuthToken(organisme._id, parameters.access_token),
                logLoginWithAccessTokenEvent(req, organisme),
            ]);
            return res.status(200).send(token);
        } else {
            throw Boom.badRequest('Token invalide');
        }
    }));

    return router;
};
