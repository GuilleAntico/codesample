const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const config = require('config');
const port = config.get('port');
const knexInterface = require('communications/knexConnections');
const DevConsole = require('@devConsole');
const devConsole = new DevConsole(__filename);
const morganMiddleware = require('app/config/morgan');
const models = require('app/models');
const routes = require('app/routes');
const errorHandler = require('app/middlewares/errorHandler');

class Server {
    static async setupExpress() {
        try {
            const app = express();
    
            // Setup Port
            app.set('port', port);
            // Setup morgan
            app.use(morganMiddleware);
    
            // Body Parser
            app.use(bodyParser.json({ limit : '5mb', extended: true}));
    
            // Setup Helmet
            app.use(helmet());
            
            // Serve a basic text page at the root
            app.get('/', (req, res)=>{
                res.send('SampleApp API');
                res.end();
            });
            devConsole.info('Express has been configured');
            return app;
        } catch(error) {
            devConsole.error('Error setting express');
            return Promise.reject(error);
        }
    }
    static async setupDatabase(app) {
        try {
            // Create knex connection
            await knexInterface.createConnection(app);
            
            // Setup models
            const modelInstances = models(app);
            app.set('models', modelInstances);
            devConsole.info('Models setup');
        } catch(error) {
            devConsole.error('Error setting up Database: ');
            return Promise.reject(error)
        }
    }
    
    static async setupLogger(app) {
        app.use((req, res, next) => devConsole.contextMiddleware(req, res, next));
        devConsole.info('Logger Initialized');
    }
    
    static async setupCORS(app) {
        try {
            // CORS
            const allowedDomains = [ 'localhost', '127.0.0.1'];
            const allowedProtocols = [ 'http://', 'https://'];
    
            // Todo: create swtich case for different envs
    
            const allowedOrigins = [];
    
            allowedProtocols.map( protocol =>allowedDomains.map( domain => {
                const origin = protocol + domain;
                return allowedOrigins.push(new RegExp(origin));
            }));
    
    
            const corsOptions = {
                origin: allowedOrigins,
                allowedHeaders: [
                    'Origin',
                    'X-Requested-With',
                    'Content-Type',
                    'Accept',
                    'Authorization',
                    'If-None-Match'
                ],
                credentials: true,
                maxAge: 60 * 10
            };
    
            app.use(cors(corsOptions));
            app.options('*', cors(corsOptions));
            devConsole.info('CORS allowing origins:', allowedOrigins.map(origin=>origin.toString()));
        } catch (error) {
            devConsole.error('Error Setting CORS');
            return Promise.reject(error);
        }
    }
    
    static async setupRoutes(app) {
        try {
            routes(app, express);
            devConsole.info('Routes set!');
        } catch(error) {
            devConsole.error('Error setting routes');
            return Promise.reject(error);
        }
    }
    static async setupErrorHandler(app) {
        try {
            app.use((error, req, res, next) => errorHandler(error, req, res, next));
            devConsole.info('Error handler set!');
        } catch(error) {
            devConsole.error('Error initializing Error Handler');
            Promise.reject(error);
        }
    }
    static async startService(app) {
        try {
            await app.listen(app.get('port'));
            devConsole.info('Express up and running on port ', app.get('port'));
        } catch(error) {
            devConsole.error('Error initializing express');
            return Promise.reject(error);
        }
    }
    static async start() {
        try {
            const app = await this.setupExpress();
            await this.setupDatabase(app);
            await this.setupLogger(app);
            await this.setupCORS(app);
            await this.setupRoutes(app);
            await this.setupErrorHandler(app);
            devConsole.info('Bootstrapping done!!');
            await this.startService(app);
        } catch(error) {
            devConsole.error(`Error Bootstrapping app ${error}`);
            process.exit(1);
        }
    }
}

module.exports = Server;