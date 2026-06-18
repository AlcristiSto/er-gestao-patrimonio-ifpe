function getEnvironmentValue(name, defaultValue) {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }

  if (typeof _getEnv !== 'undefined') {
    const value = _getEnv(name);

    if (value) {
      return value;
    }
  }

  return defaultValue;
}

const databaseName = getEnvironmentValue('MONGO_DATABASE', getEnvironmentValue('MONGO_INITDB_DATABASE', 'patrimonio'));
const collectionName = getEnvironmentValue('MONGO_CATMAT_COLLECTION', 'catmat');
const cargaPath = '/carga/carga.json';
const batchSize = 1000;
const fs = require('fs');

function parseCargaFile(path) {
  const content = fs.readFileSync(path, 'utf8').trim();

  if (!content) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.resultado)) {
    return parsed.resultado;
  }

  if (Object.prototype.hasOwnProperty.call(parsed, 'resultado')) {
    throw new Error('The carga.json resultado field must be an array.');
  }

  return [parsed];
}

function insertInBatches(collection, documents) {
  for (let index = 0; index < documents.length; index += batchSize) {
    collection.insertMany(documents.slice(index, index + batchSize), { ordered: false });
  }
}

const targetDatabase = db.getSiblingDB(databaseName);
const targetCollection = targetDatabase.getCollection(collectionName);

if (targetCollection.estimatedDocumentCount() > 0) {
  print(`Collection ${databaseName}.${collectionName} already has data. Initial load skipped.`);
} else {
  const documents = parseCargaFile(cargaPath);

  if (documents.length === 0) {
    print(`File ${cargaPath} has no documents to import.`);
  } else {
    insertInBatches(targetCollection, documents);
    print(`Loaded ${documents.length} documents into ${databaseName}.${collectionName}.`);
  }
}

targetCollection.createIndex({
  nomeGrupo: 'text',
  nomeClasse: 'text',
  descricaoItem: 'text',
});

print(`Text index ensured on ${databaseName}.${collectionName}.`);
