const request = require('supertest');
const assert = require('assert');
const server = require('../../src/http/server');
const { withMongoDB } = require('./with-mongodb');
const { newModerateurAccount, newOrganismeAccount, newFinancerAccount } = require('./data/dataset');

module.exports = {
    withServer: callback => {
        return withMongoDB(testContext => {

            return callback(Object.assign({}, testContext, {
                startServer: async (custom = {}) => {
                    let components = await testContext.getComponents();
                    return server({
                        ...components,
                        ...custom,
                    });
                },
                logAsModerateur: async (app, courriel, custom) => {

                    await testContext.insertIntoDatabase('accounts', newModerateurAccount({
                        courriel,
                    }, custom));

                    let response = await request(app)
                    .post('/api/backoffice/login')
                    .send({ identifiant: courriel, password: 'password' });
                    assert.strictEqual(response.statusCode, 200);

                    return response.body.access_token;
                },
                logAsOrganisme: async (app, courriel, siret, custom) => {

                    await testContext.insertIntoDatabase('accounts', newOrganismeAccount({
                        _id: parseInt(siret),
                        SIRET: parseInt(siret),
                        courriel,
                        meta: {
                            siretAsString: siret
                        },
                    }, custom));

                    let response = await request(app)
                    .post('/api/backoffice/login')
                    .send({ identifiant: siret, password: 'password' });
                    assert.strictEqual(response.statusCode, 200);

                    return response.body.access_token;
                },
                logAsFinanceur: async (app, courriel, codeFinanceur, custom) => {

                    await testContext.insertIntoDatabase('accounts', newFinancerAccount({
                        courriel,
                        codeFinanceur: `${codeFinanceur}`,
                        ...custom,
                    }, custom));

                    let response = await request(app)
                    .post('/api/backoffice/login')
                    .send({ identifiant: courriel, password: 'password' });
                    assert.strictEqual(response.statusCode, 200);

                    return response.body.access_token;
                },
                generateKairosToken: async app => {
                    let { auth } = await testContext.getComponents();
                    let jwt = await auth.buildJWT('kairos', {
                        sub: 'kairos',
                        iat: Math.floor(Date.now() / 1000)
                    });

                    let response = await request(app)
                    .post('/api/backoffice/generate-auth-url')
                    .set('authorization', `Bearer ${jwt.access_token}`)
                    .send({
                        siret: '22222222222222',
                        raison_sociale: 'Pole Emploi Formation',
                        courriel: 'contact@organisme.fr',
                        region: 'Ile-de-France',

                    });

                    return response.body.url;
                }
            }));
        });
    }
};
