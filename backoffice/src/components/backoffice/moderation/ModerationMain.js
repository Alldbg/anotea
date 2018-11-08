import React from 'react';
import PropTypes from 'prop-types';

import SideMenu from './SideMenu';
import ModerationPanel from './ModerationPanel';
import OrganisationPanel from './OrganisationPanel';

export default class Main extends React.Component {

    state = {
        currentPage: 'moderation'
    }

    propTypes = {
        id: PropTypes.string.isRequired,
        codeRegion: PropTypes.string.isRequired,
    }

    handleChangePage = page => {
        this.setState({ currentPage: page });
    }

    render() {
        return (
            <div className="mainPanel">
                <SideMenu onChangePage={this.handleChangePage} />

                {this.state.currentPage === 'moderation' &&
                <ModerationPanel
                    id={this.props.id}
                    codeRegion={this.props.codeRegion} />}

                {this.state.currentPage === 'organisme' &&
                <OrganisationPanel
                    codeRegion={this.props.codeRegion} />}
            </div>
        );
    }
}
