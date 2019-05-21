import React, { Component } from 'react';
import moment from 'moment/moment';
import PropTypes from 'prop-types';
import Stars from './Stars';
import './Avis.scss';

export default class Avis extends Component {

    static propTypes = {
        avis: PropTypes.object.isRequired,
    };

    render() {

        let { avis } = this.props;

        return (
            <div className="Avis d-flex flex-column align-items-stretch">
                <div className="stagiaire">
                    <Stars note={avis.notes.global} />
                    <span className="par">par</span>
                    <span className="pseudo">{avis.pseudo ? avis.pseudo : 'un stagiaire'}</span>
                </div>
                <div className={`titre ${avis.commentaire.titre ? 'visible' : 'invisible'}`}>
                    {avis.commentaire.titre}
                </div>
                <div className={`texte ${avis.commentaire.texte ? 'visible' : 'invisible'}`}>
                    {avis.commentaire.texte}
                </div>
                {avis.commentaire.reponse &&
                <div className="reponse">
                    <div className="titre">Réponse de l'organisme</div>
                    <div className="texte">{avis.commentaire.reponse}</div>
                </div>
                }
                <div className="date">
                    Session du {moment(avis.startDate).format('DD/MM/YYYY')}
                    {avis.startDate !== avis.scheduledEndDate &&
                    <span>au {moment(avis.scheduledEndDate).format('DD/MM/YYYY')}</span>
                    }
                </div>
            </div>
        );
    }
}
