import React from 'react';
import PropTypes from 'prop-types';
import { maskTitle, unmaskTitle } from '../../../../../../lib/avisService';
import './Titre.scss';

export default class Titre extends React.Component {

    static propTypes = {
        avis: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
        className: PropTypes.string.isRequired,
    };


    toggle = async () => {
        let avis = this.props.avis;
        let updated = await (avis.titleMasked ? unmaskTitle(avis._id) : maskTitle(avis._id));
        this.props.onChange(updated);
    };

    render() {
        let avis = this.props.avis;

        if (!avis.comment.title) {
            return <div className={`Titre empty ${this.props.className}`}>Aucun titre</div>;
        }
        return (
            <div className={`Titre ${this.props.className}`}>
                <span className={`mr-1 title ${avis.titleMasked ? 'masked' : ''}`}>{avis.comment.title}</span>
                <i className={`far ${avis.titleMasked ? 'fa-eye masked' : 'fa-eye-slash'} toggable`} onClick={this.toggle} />
            </div>
        );
    }
}
