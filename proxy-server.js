const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const { setupVNPayRoutes } = require('./src/services/vnpayIPNHandler');

const PORT = process.env.SWAGGER_PORT || process.env.PORT || 4000;
const HOST = process.env.SWAGGER_HOST || '0.0.0.0';
const app = express();

const openapiPath = path.join(__dirname, 'docs', 'openapi.yaml');
let openapiDocument = null;

try {
	const fileContent = fs.readFileSync(openapiPath, 'utf-8');
	openapiDocument = YAML.parse(fileContent);
} catch (error) {
	console.error('Cannot read OpenAPI file:', error.message);
	process.exit(1);
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/openapi.json', (_req, res) => {
	res.json(openapiDocument);
});

const swaggerUiOptions = {
	customSiteTitle: 'PMBH Cafe POS API Docs',
	customCss: '.swagger-ui .topbar { display: none; }',
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, swaggerUiOptions));

setupVNPayRoutes(app);

app.use((err, _req, res, _next) => {
	console.error('Unexpected error:', err);
	res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, HOST, () => {
	console.log(`Swagger server listening on http://${HOST}:${PORT}/docs`);
});
