import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import 'popper.js/dist/popper.min.js';
import 'bootstrap/dist/js/bootstrap.min.js';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './common/utils/moment-fr';
import WebFont from 'webfontloader';
import * as Sentry from './common/utils/sentry';
import * as Hotjar from './common/utils/hotjar';
import * as GoogleAnalytics from './common/components/analytics/AnalyticsContext';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { createRouter } from './common/utils/router';
import Questionnaire from './questionnaire/Questionnaire';
import Stats from './stats/Stats';
import Widget from './widget/Widget';
import './common/styles/global.scss';

let env = process.env;

WebFont.load({
    google: {
        families: ['Lato:400,700,900']
    }
});

Sentry.initialize(env.REACT_APP_ANOTEA_SENTRY_DSN);
Hotjar.initialize(env.REACT_APP_ANOTEA_HOTJAR_ID);
GoogleAnalytics.initialize(env.REACT_APP_ANOTEA_GOOGLE_ANALYTICS_ID, { debug: false });

const BackofficeChunksLoader = React.lazy(() => import('./backoffice/Backoffice'));

let app = (
    <Router>
        <Switch>
            <Redirect exact from="/" to="/admin" />
        </Switch>

        <Route path="/questionnaire" render={() => <Questionnaire />} />
        <Route path="/stats" render={() => <Stats />} />
        <Route path="/widget" render={() => <Widget />} />
        <Route path="/admin" render={props => {
            return (
                <Suspense fallback={<div></div>}>
                    <BackofficeChunksLoader router={createRouter(props)} />
                </Suspense>
            );
        }}
        />

    </Router>
);
ReactDOM.render(app, document.getElementById('root'));
