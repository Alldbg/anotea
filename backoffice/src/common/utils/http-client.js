import { getToken } from '../../backoffice/utils/session';
import EventEmitter from 'events';

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

const getReferrerUrl = () => new URL((document.referrer || 'http://unknown'));
const getHeaders = () => {

    let token = getToken();

    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(window.location.pathname.startsWith('/widget') ? {
            'X-Anotea-Widget': getReferrerUrl().origin,
            'X-Anotea-Widget-Referrer': getReferrerUrl(),
        } : {})
    };
};

export const _get = path => {
    return fetch(`/api${path}`, {
        method: 'GET',
        headers: {
            ...getHeaders(),
        }
    })
    .then(res => handleResponse(path, res));
};

export const _post = (path, body) => {
    return fetch(`/api${path}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
    })
    .then(res => handleResponse(path, res));
};

export const _put = (path, body = {}) => {
    return fetch(`/api${path}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body)
    })
    .then(res => handleResponse(path, res));
};

export const _delete = path => {
    return fetch(`/api${path}`, {
        method: 'DELETE',
        headers: getHeaders()
    })
    .then(res => handleResponse(path, res));
};

export const subscribeToHttpEvent = (eventName, callback) => emitter.on(eventName, callback);
