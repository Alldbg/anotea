import React from 'react';
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';
import './PeriodeFilter.scss';

import 'react-datepicker/dist/react-datepicker.css';

const pStyle = {
    'padding': '0px',
    'margin': '0px',
    'color': '#24303A',
    'fontFamily': 'Lato',
    'fontSize': '18px',
    'fontWeight': 'bold',
    'lineHeight': '22px',
};

export default class PeriodeFilter extends React.Component {

    static propTypes = {
        label: PropTypes.string.isRequired,
        placeholderText: PropTypes.string.isRequired,
        recentAvis: PropTypes.string.isRequired,
        oldestAvis: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            startDate: null,
        };
    }

    handleChangeStart = date => {
        this.setState({
            startDate: date,
        });
    }

    handleChangeEnd = date => {
        this.setState({
            endDate: date,
        });
    }

    handleClear = () => {
        this.setState({
            startDate: null,
            endDate: null
        });
    }

    render() {
        
        return (
            <div>
                <p style={pStyle}>{this.props.label}</p>
                <div className="datepicker-container">
                    <DatePicker
                        openToDate={new Date(this.props.oldestAvis)}
                        dateFormat="dd/MM/yyyy"
                        selectsStart
                        selected={this.state.startDate}
                        onChange={this.handleChangeStart}
                        placeholderText={this.props.placeholderText}
                        minDate={new Date(this.props.oldestAvis)}
                        maxDate={this.state.endDate ? this.state.endDate : new Date(this.props.recentAvis)}
                    />
                    {'à '}
                    <DatePicker
                        openToDate={this.state.startDate}
                        dateFormat="dd/MM/yyyy"
                        selectsEnd
                        selected={this.state.endDate}
                        onChange={this.handleChangeEnd}
                        placeholderText={this.props.placeholderText}
                        disabled={!this.state.startDate && true}
                        minDate={this.state.startDate}
                        maxDate={new Date(this.props.recentAvis)}
                    />
                    {this.state.startDate &&
                        <i className="fas fa-times-circle" onClick={this.handleClear} />
                    }
                </div>
            </div>
        );
    }
}
