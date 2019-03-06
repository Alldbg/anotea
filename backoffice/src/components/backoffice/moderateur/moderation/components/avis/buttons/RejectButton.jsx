import React from 'react';
import PropTypes from 'prop-types';
import { rejectAvis } from '../../../moderationService';
import Modal from '../../../../../common/Modal';
import Button from '../../../../../common/Button';
import { Dropdown, DropdownDivider, DropdownItem } from '../../../../../common/Dropdown';

export default class RejectButton extends React.Component {

    state = {
        showModal: false,
    };

    static propTypes = {
        avis: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
    };

    reject = async (avis, reason) => {
        this.setState({ showModal: false });
        let updated = await rejectAvis(avis._id, reason);
        this.props.onChange(updated, {
            message: {
                title: reason === 'injure' ? 'Avis rejeté pour injure' : null,
                type: 'local',
                text: (
                    <span>L&apos;avis a été <b>rejeté</b>.
                        {reason === 'injure' ? ' Un email a été adressé au stagiaire.' : ''}
                    </span>),
            }
        });
    };

    handleCancel = () => {
        this.setState({ showModal: false });
    };

    getModal = () => {
        return (
            <Modal
                title="Rejeter cet avis pour injure"
                body={
                    <div>
                        Le <b>rejet pour injure</b> entraîne <b>l&apos;envoi d&apos;un email </b> automatique au
                        stagiaire pour l&apos;informer que le <b>commentaire ne sera pas publié</b>. Confirmez-vous
                        cette demande ?
                    </div>
                }
                onClose={this.handleCancel}
                onConfirmed={() => this.reject(this.props.avis, 'injure')} />
        );
    };

    render() {
        let { avis } = this.props;

        let isRejected = !!this.props.avis.rejected;
        return (
            <div className="RejectButton">
                {this.state.showModal && this.getModal()}
                <Dropdown
                    header="Rejeter"
                    button={
                        <Button size="large" color="red" disabled={isRejected} toggable={true}>
                            <i className="far fa-times-circle" />
                        </Button>
                    }
                    items={
                        <div>
                            <DropdownItem onClick={() => this.setState({ showModal: true })}>
                                Injure
                            </DropdownItem>
                            <DropdownDivider />
                            <DropdownItem onClick={() => this.reject(avis, 'alerte')}>
                                Alerte
                            </DropdownItem>
                            <DropdownDivider />
                            <DropdownItem onClick={() => this.reject(avis, 'non concerné')}>
                                Non concerné
                            </DropdownItem>
                        </div>
                    }
                />
            </div>
        );
    }
}
