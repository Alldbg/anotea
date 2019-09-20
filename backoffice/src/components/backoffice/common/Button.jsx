import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import './Button.scss';

const Button = props => {

    let sizeClass = `a-btn-${props.size}`;
    let colorClass = props.color ? `a-btn-${props.color}` : '';
    let disabledClass = props.disabled ? 'a-btn-disabled' : '';
    let toggableClass = props.toggable ? 'dropdown-toggle' : '';

    return (
        <button
            type="button"
            {..._.omit(props, ['size', 'color', 'toggable', 'className'])}
            {...(props.toggable ? { 'data-toggle': 'dropdown' } : {})}
            style={props.style || {}}
            className={`Button ${sizeClass} ${colorClass} ${disabledClass} ${toggableClass} ${props.className || ''}`} />
    );
};

Button.propTypes = {
    size: PropTypes.string.isRequired,
    color: PropTypes.string,
    disabled: PropTypes.bool,
    toggable: PropTypes.bool,
    className: PropTypes.string,
    style: PropTypes.object,
};

export default Button;