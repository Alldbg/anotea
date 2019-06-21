/* global fetch */
import EventEmitter from 'events';
import { getReferrerUrl } from '../utils';

class HTTPError extends Error {
    constructor(message, json) {
        super(message);
        this.json = json;
    }
}

const emitter = new EventEmitter();
const handleResponse = (path, response) => {
    let statusCode = response.status;
    if (statusCode >= 400 && statusCode < 600) {
        emitter.emit('http:error', response);
        throw new HTTPError(`Server returned ${statusCode} when requesting resource ${path}`, response.json());
    }
    return response.json();
};

export const _get = path => {
    return fetch(path, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Anotea-Widget': getReferrerUrl().origin,
        }
    })
    .then(res => handleResponse(path, res));
};

export const _post = (path, body) => {
    return fetch(path, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Anotea-Widget': getReferrerUrl().origin,
        },
        body: JSON.stringify(body)
    })
    .then(res => handleResponse(path, res));
};

