import React, { Component } from 'react';
import { getStagiaireInfo } from './lib/stagiaireService';
import getToken from './lib/getToken';
import Questionnaire from './components/pages/Questionnaire';
import Remerciements from './components/pages/Remerciements';
import ErrorPage from './components/pages/ErrorPage';
import Footer from './components/common/Footer';
import './App.scss';

class App extends Component {

    state = {
        stagiaire: null,
        infosRegion: null,
        showRemerciements: false,
        showErrorPage: false,
    };

    fetchStagiaire = async () => {
        try {
            let token = getToken();
            let data = await getStagiaireInfo(token);
            this.setState({
                stagiaire: data.stagiaire,
                infosRegion: data.infosRegion,
                showRemerciements: data.submitted,
            });
        } catch (err) {
            console.error('An error occured', err);
            this.setState({ showErrorPage: true });
        }
    };

    componentDidMount() {
        this.fetchStagiaire(this.state.token);
    }

    render() {
        let { stagiaire } = this.state;

        if (this.state.showErrorPage) {
            return <ErrorPage />;
        }

        if (!stagiaire) {
            //Not yet loaded
            return (<div />);
        }

        return (
            <div>
                {this.state.showRemerciements ?
                    <Remerciements stagiaire={stagiaire} infosRegion={this.state.infosRegion} /> :
                    <Questionnaire
                        stagiaire={stagiaire}
                        onSubmit={() => this.setState({ showRemerciements: true })} />
                }
                <Footer stagiaire={stagiaire} />
            </div>
        );
    }
}

export default App;