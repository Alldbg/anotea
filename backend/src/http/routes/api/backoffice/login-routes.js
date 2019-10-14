const express = require('express');
const Boom = require('boom');
const Joi = require('joi');
const { tryAndCatch, getRemoteAddress } = require('../../routes-utils');

module.exports = ({ db, auth, passwords }) => {

    const router = express.Router(); // eslint-disable-line new-cap
    let { checkPassword, hashPassword } = passwords;

    const logLoginEvent = (req, profile, id) => {
        return db.collection('events').insertOne({
            date: new Date(),
            type: 'login',
            source: { user: req.body.identifiant, profile, ip: getRemoteAddress(req), id }
        });
    };

    const logLoginWithAccessTokenEvent = (req, organisme, id) => {
        return db.collection('events').insertOne({
            date: new Date(),
            type: 'login-access-token',
            source: {
                profile: 'organisme',
                siret: organisme.meta.siretAsString,
                ip: getRemoteAddress(req),
                id
            }
        });
    };

    const handleModerateurOrFinanceur = async (req, account) => {
        logLoginEvent(req, account.profile, account._id);
        return await auth.buildJWT('backoffice', {
            sub: req.body.identifiant,
            profile: account.profile,
            id: account._id,
            codeRegion: account.codeRegion,
            codeFinanceur: account.codeFinanceur,
        });
    };

    const handleOrganisme = async (req, account) => {
        logLoginEvent(req, 'organisme', account._id);
        return await auth.buildJWT('backoffice', {
            sub: account.meta.siretAsString,
            profile: 'organisme',
            id: account.meta.siretAsString,
            codeRegion: account.codeRegion,
            raisonSociale: account.raisonSociale,
            siret: account.meta.siretAsString,
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

    const rehashPassword = async (account, password) => {

        if (account.meta && account.meta.rehashed) {
            return Promise.resolve(account);
        }

        return db.collection('accounts').updateOne({ _id: account._id }, {
            $set: {
                'meta.rehashed': true,
                'passwordHash': await hashPassword(password)
            }
        });
    };

    router.post('/backoffice/login', tryAndCatch(async (req, res) => {

        let { identifiant, password } = await Joi.validate(req.body, {
            identifiant: Joi.string().required(),
            password: Joi.string().required(),
        }, { abortEarly: false });

        let token;
        let account = await db.collection('accounts').findOne({ courriel: identifiant });
        if (account && await checkPassword(password, account.passwordHash)) {
            await rehashPassword(account, password);
            token = await handleModerateurOrFinanceur(req, account);
        }

        account = await db.collection('accounts').findOne({
            'meta.siretAsString': identifiant,
            'passwordHash': { $exists: true },
        });
        if (account && await checkPassword(password, account.passwordHash)) {
            await rehashPassword(account, password);
            token = await handleOrganisme(req, account);
        }

        if (token) {
            return res.json(token);
        } else {
            throw Boom.badRequest('Identifiant ou mot de passe invalide');
        }
    }));

    router.get('/backoffice/login', tryAndCatch(async (req, res) => {

        const parameters = await Joi.validate(req.query, {
            access_token: Joi.string().required(),
            origin: Joi.string(),
        }, { abortEarly: false });

        let user;
        try {
            user = await auth.checkJWT('backoffice', parameters.access_token);
        } catch (e) {
            throw Boom.badRequest('Token invalide', e);
        }

        let organisme = await db.collection('accounts').findOne({
            'meta.siretAsString': user.sub,
        });

        if (await isTokenAlreadyUsed(organisme._id, parameters.access_token)) {
            throw Boom.badRequest('Token déjà utilisé');
        }

        if (organisme) {
            let [token] = await Promise.all([
                handleOrganisme(req, organisme),
                invalidateAuthToken(organisme._id, parameters.access_token),
                logLoginWithAccessTokenEvent(req, organisme, organisme._id),
            ]);
            return res.json(token);
        } else {
            throw Boom.badRequest('Token invalide');
        }
    }));

    return router;
};