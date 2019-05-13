import { _post, _get } from '../utils/http-client';

export const getStagiaireInfo = token => _get(`/questionnaire/${token}`);

export const submitAvis = (token, avis) => _post(`/questionnaire/${token}`, avis);

export const checkBadwords = sentence => _get(`/questionnaire/checkBadwords?sentence=${sentence}`);