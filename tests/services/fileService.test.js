import { expect } from 'chai';
import path from 'path';
import { promises as fs } from 'fs';
import fileService from '../../api/services/fileService.js';

describe('FileService', () => {
  before(async () => {
    await fileService.init();
  });

  after(async () => {
    await fileService.cleanup();
  });

  it('should initialize successfully', async () => {
    const result = await fileService.init();
    expect(result).to.be.true;
    expect(fileService.initialized).to.be.true;
  });

  it('should write and read JSON files', async () => {
    const testData = { test: 'data' };
    const testFile = 'test.json';

    await fileService.writeJSON(testFile, testData);
    const readData = await fileService.readFile(testFile);

    expect(readData).to.deep.equal(testData);
  });
});
