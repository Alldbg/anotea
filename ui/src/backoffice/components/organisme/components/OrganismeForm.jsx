import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import moment from 'moment';
import { Form, Periode, Select } from '../../common/page/form/Form';
import { getFormations } from '../../../services/formationsService';
import Button from '../../../../common/components/Button';
import BackofficeContext from '../../../BackofficeContext';
import { getDepartements } from '../../../services/departementsService';

export default class OrganismeForm extends React.Component {

    static contextType = BackofficeContext;

    static propTypes = {
        query: PropTypes.object.isRequired,
        onSubmit: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            periode: {
                debut: null,
                fin: null,
            },
            departements: {
                selected: null,
                loading: true,
                results: [],
            },
            sirens: {
                selected: null,
                loading: true,
                results: [],
            },
            formations: {
                selected: null,
                loading: true,
                results: [],
            },
        };
    }

    async componentDidMount() {

        let { account } = this.context;
        let { query } = this.props;

        this.loadSelectBox('departements', () => getDepartements())
        .then(results => {
            return this.updateSelectBox('departements', results.find(f => f.code === query.departement));
        });

        this.loadSelectBox('sirens', () => {
            return [
                { siren: account.siret.substring(0, 9), name: 'Tous les centres' }
            ];
        })
        .then(results => {
            return this.updateSelectBox('sirens', results.find(o => o.siren === query.siren));
        });

        this.loadSelectBox('formations', () => getFormations({ organisme: query.organisme || account.siret }))
        .then(results => {
            return this.updateSelectBox('formations', results.find(f => f.numeroFormation === query.numeroFormation));
        });

        this.setState({
            periode: {
                debut: query.debut ? moment(parseInt(query.debut)).toDate() : null,
                fin: query.fin ? moment(parseInt(query.fin)).toDate() : null,
            },
        });
    }

    getFormParametersFromQuery = () => {
        let { query } = this.props;
        return _.pick(query, ['departement', 'siren', 'numeroFormation', 'debut', 'fin']);
    };

    getFormParameters = () => {
        let { departements, sirens, formations, periode } = this.state;
        return {
            departement: _.get(departements, 'selected.code', null),
            siren: _.get(sirens, 'selected.siren', null),
            numeroFormation: _.get(formations, 'selected.numeroFormation', null),
            debut: periode.debut ? moment(periode.debut).valueOf() : null,
            fin: periode.fin ? moment(periode.fin).valueOf() : null,
        };
    };

    isFormLoading = () => {
        let { departements, sirens, formations } = this.state;
        return departements.loading || sirens.loading || formations.loading;
    };

    isFormSynchronizedWithQuery = () => {
        let data = _(this.getFormParameters()).omitBy(_.isNil).value();
        return this.isFormLoading() || _.isEqual(data, this.getFormParametersFromQuery());
    };

    updatePeriode = periode => {
        return new Promise(resolve => {
            this.setState({
                periode: Object.assign({}, periode),
            }, resolve);
        });
    };

    loadSelectBox = async (type, loader) => {
        this.setState({
            [type]: {
                selected: null,
                loading: true,
                results: [],
            },
        });

        let results = await loader();

        return new Promise(resolve => {
            this.setState({
                [type]: {
                    selected: null,
                    loading: false,
                    results,
                },
            }, () => resolve(results));
        });
    };

    updateSelectBox = (type, selected) => {
        return new Promise(resolve => {
            this.setState({
                [type]: {
                    ...this.state[type],
                    selected,
                },
            }, resolve);
        });
    };

    resetForm = () => {
        this.setState({
            periode: {
                debut: null,
                fin: null,
            },
            departements: {
                selected: null,
                ..._.pick(this.state.departements, ['results', 'loading']),
            },
            sirens: {
                selected: null,
                ..._.pick(this.state.sirens, ['results', 'loading']),
            },
            formations: {
                selected: null,
                ..._.pick(this.state.formations, ['results', 'loading']),
            },
        });
    };

    render() {
        let { query } = this.props;
        let { departements, sirens, formations, periode } = this.state;
        let user = this.context;
        let formSynchronizedWithQuery = this.isFormSynchronizedWithQuery();

        return (
            <Form>
                <div className="form-row">
                    <div className="form-group col-lg-6 col-xl-3">
                        <label>Période</label>
                        <Periode
                            periode={periode}
                            min={moment('2016-01-01T00:00:00Z').toDate()}
                            onChange={periode => this.updatePeriode(periode)}
                        />
                    </div>
                    <div className="form-group col-lg-6 col-xl-3">
                        <label>Départements</label>
                        <Select
                            value={departements.selected}
                            options={departements.results}
                            loading={departements.loading}
                            optionKey="code"
                            label={option => option.label}
                            placeholder={'Tous les départements'}
                            trackingId="Départements"
                            onChange={option => this.updateSelectBox('departements', option)}
                        />
                    </div>
                    <div className="form-group col-lg-6">
                        <label>Centres</label>
                        <Select
                            value={sirens.selected}
                            options={sirens.results}
                            loading={sirens.loading}
                            optionKey="organisme"
                            label={option => option.name}
                            placeholder={user.raison_sociale || ''}
                            trackingId="Centres"
                            onChange={async option => {
                                await this.updateSelectBox('sirens', option);
                                this.loadSelectBox('formations', () => {
                                    let organisme = option ? option.siren : user.siret;
                                    if (organisme !== query.siren) {
                                        return getFormations({ organisme });
                                    }
                                });
                            }}
                        />
                    </div>
                    <div className="form-group offset-lg-6 col-lg-6">
                        <label>Formation</label>
                        <Select
                            value={formations.selected}
                            options={formations.results}
                            loading={formations.loading}
                            optionKey="numeroFormation"
                            label={option => option.title}
                            placeholder={'Toutes les formations'}
                            trackingId="Formation"
                            onChange={option => this.updateSelectBox('formations', option)}
                        />
                    </div>
                </div>
                <div className="form-row justify-content-center">
                    <div className="form-group buttons">
                        <Button size="small" onClick={this.resetForm} className="mr-3">
                            <i className="fas fa-times mr-2"></i>
                            Réinitialiser les filtres
                        </Button>
                        <Button
                            size="large"
                            color="orange"
                            onClick={() => this.props.onSubmit(this.getFormParameters())}
                            style={formSynchronizedWithQuery ? {} : { border: '2px solid' }}
                        >
                            {!formSynchronizedWithQuery && <i className="fas fa-sync a-icon"></i>}
                            Rechercher
                        </Button>
                    </div>
                </div>
            </Form>
        );
    }
}
