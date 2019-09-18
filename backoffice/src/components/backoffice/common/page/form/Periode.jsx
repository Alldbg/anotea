import React from 'react';
import PropTypes from 'prop-types';
import Date from './Date';
import './Periode.scss';

export default class Periode extends React.Component {

    static propTypes = {
        periode: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
        min: PropTypes.object,
    };

    onDateChange(type, date) {
        let { periode, onChange } = this.props;
        return onChange(Object.assign({}, periode, { [type]: date }));
    }

    render() {
        let { periode, min } = this.props;

        return (
            <div className="Periode d-flex justify-content-between align-items-center">
                <i className="far fa-calendar"></i>
                <Date
                    value={periode.startDate}
                    min={min}
                    onChange={date => this.onDateChange('startDate', date)}
                />
                <span className="between">à</span>
                <Date
                    value={periode.endDate}
                    min={periode.startDate || min}
                    onChange={date => this.onDateChange('endDate', date)}
                />
            </div>
        );
    }
}
