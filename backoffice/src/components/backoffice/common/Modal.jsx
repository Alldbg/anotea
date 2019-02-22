import React from 'react';
import PropTypes from 'prop-types';
import './Modal.scss';
import Button from "./Button";
import { Dropdown, DropdownDivider, DropdownItem } from "./Dropdown";

export default class Modal extends React.Component {

    static propTypes = {
        message: PropTypes.object.isRequired,
        onClose: PropTypes.func.isRequired,
        onConfirmed: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            showTransition: false,
        };
    }

    componentDidMount() {
        let body = document.getElementsByTagName('body')[0];
        body.classList.add('modal-open');
        body.style.paddingRight = '15px';

        this.triggerTransition();
    }

    componentWillUnmount() {
        let body = document.getElementsByTagName('body')[0];
        body.classList.remove('modal-open');
        body.style.paddingRight = null;
    }

    triggerTransition() {
        setTimeout(() => this.setState({ showTransition: true }), 5);
    }

    render() {
        let { message, onClose, onConfirmed } = this.props;
        let transitionClass = this.state.showTransition ? 'show' : '';

        return (
            <div className="Modal">
                <div className={`modal-backdrop fade ${transitionClass}`} />
                <div className={`modal fade ${transitionClass}`} tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{message.title}</h5>
                            </div>
                            <div className="modal-body">
                                <p>{message.text}</p>
                            </div>
                            <div className="modal-footer">

                                <div className="d-flex justify-content-end">
                                    <Button size="small" color="red" onClick={onClose} className="mr-2">
                                        Annuler
                                    </Button>
                                    <Button size="large" color="blue" onClick={onConfirmed}>
                                        Confirmer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
