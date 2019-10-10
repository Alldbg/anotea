const request = require('supertest');
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;
const { withServer } = require('../../../../../helpers/with-server');
const { newComment, newTrainee, newOrganismeAccount } = require('../../../../../helpers/data/dataset');

describe(__filename, withServer(({ startServer, insertIntoDatabase, logAsModerateur, createIndexes, getComponents, getTestDatabase }) => {

    it('can search avis by email (fulltext)', async () => {
        let app = await startServer();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('trainee', newTrainee({
                token: '12345',
                trainee: {
                    email: 'robert@domaine.com',
                },
            })),
            insertIntoDatabase('comment', newComment()),
            insertIntoDatabase('comment', newComment({
                pseudo: 'kikoo',
                token: '12345',
            })),
            createIndexes(['comment']),
        ]);

        let response = await request(app)
        .get('/api/backoffice/avis?fulltext=robert@domaine.com')
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.body.avis.length, 1);
    });

    it('can search avis by email (no match) (fulltext)', async () => {
        let app = await startServer();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment()),
            createIndexes(['comment']),
        ]);

        let response = await request(app)
        .get('/api/backoffice/avis?fulltext=unknown@unknown.com')
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.body.avis.length, 0);
    });

    it('can search avis by titre (fulltext)', async () => {
        let app = await startServer();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({
                pseudo: 'pseudo',
                comment: {
                    title: 'Trop Génial',
                },
            })),
            insertIntoDatabase('comment', newComment({
                comment: {
                    title: 'Pas cool',
                },
            })),
            createIndexes(['comment']),
        ]);

        let response = await request(app)
        .get('/api/backoffice/avis?fulltext=Trop')
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.body.avis.length, 1);
        assert.strictEqual(response.body.avis[0].pseudo, 'pseudo');
    });

    it('can search avis by titre (no match) (fulltext)', async () => {
        let app = await startServer();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment()),
            createIndexes(['comment']),
        ]);

        let response = await request(app)
        .get('/api/backoffice/avis?fulltext=NOMATCH')
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.body.avis.length, 0);
    });

    it('can publish reponse', async () => {

        let app = await startServer();
        let comment = newComment();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', comment),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${comment._id}/publishReponse`)
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.ok(response.body.reponse.lastStatusUpdate);
        assert.deepStrictEqual(response.body.reponse.status, 'published');
    });

    it('can reject reponse', async () => {

        let app = await startServer();
        let comment = newComment();
        let organisme = newOrganismeAccount({ SIRET: parseInt(comment.training.organisation.siret) });
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', comment),
            insertIntoDatabase('accounts', organisme)
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${comment._id}/rejectReponse`)
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.ok(response.body.reponse.lastStatusUpdate);
        assert.deepStrictEqual(response.body.reponse.status, 'rejected');

        let { mailer } = await getComponents();
        let email = mailer.getCalls()[0];
        assert.deepStrictEqual(email[0], { to: 'contact@poleemploi-formation.fr' });
    });

    it('can edit an avis', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({
                _id: id,
                comment: {
                    text: 'Génial'
                },
            })),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${id}/edit`)
        .send({ text: 'New message' })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.comment.text, 'New message');
        assert.deepStrictEqual(response.body.meta.history[0].comment.text, 'Génial');
        assert.ok(response.body.lastStatusUpdate);
    });

    it('can publish an avis', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({ _id: id, token: '12345' })),
            insertIntoDatabase('trainee', newTrainee({ _id: new ObjectID(), token: '12345' })),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${id}/publish`)
        .send({ qualification: 'positif' })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.moderated, true);
        assert.deepStrictEqual(response.body.published, true);
        assert.deepStrictEqual(response.body.reported, false);
        assert.deepStrictEqual(response.body.rejectReason, null);
        assert.deepStrictEqual(response.body.qualification, 'positif');
        assert.ok(response.body.lastStatusUpdate);
    });

    it('can reject an avis', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({ _id: id, token: '12345' })),
            insertIntoDatabase('trainee', newTrainee({ _id: new ObjectID(), token: '12345' })),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${id}/reject`)
        .send({ reason: 'injure' })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.moderated, true);
        assert.deepStrictEqual(response.body.published, false);
        assert.deepStrictEqual(response.body.rejected, true);
        assert.deepStrictEqual(response.body.reported, false);
        assert.deepStrictEqual(response.body.rejectReason, 'injure');
        assert.ok(response.body.lastStatusUpdate);
    });

    it('can delete an avis', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({ _id: id })),
        ]);

        let response = await request(app)
        .delete(`/api/backoffice/avis/${id}`)
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        let db = await getTestDatabase();
        let count = await db.collection('comment').countDocuments({ _id: id });
        assert.strictEqual(count, 0);
    });

    it('can mask pseudo', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({ _id: id })),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${id}/pseudo`)
        .send({ mask: true })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.pseudoMasked, true);
    });

    it('can unmask pseudo', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({ _id: id })),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${id}/pseudo`)
        .send({ mask: false })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.pseudoMasked, false);
    });

    it('can mask title', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({ _id: id })),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${id}/title`)
        .send({ mask: true })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.comment.titleMasked, true);
    });

    it('can unmask title', async () => {

        let app = await startServer();
        const id = new ObjectID();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
            insertIntoDatabase('comment', newComment({ _id: id })),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${id}/title`)
        .send({ mask: false })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.comment.titleMasked, false);
    });

    it('can not reject unknown avis', async () => {

        let app = await startServer();
        let [token] = await Promise.all([
            logAsModerateur(app, 'admin@pole-emploi.fr'),
        ]);

        let response = await request(app)
        .put(`/api/backoffice/avis/${new ObjectID()}/reject`)
        .send({ reason: 'alerte' })
        .set('authorization', `Bearer ${token}`);

        assert.strictEqual(response.statusCode, 404);
    });
}));
