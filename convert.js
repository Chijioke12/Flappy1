import fs from 'fs';
import path from 'path';

const buildDir = './build';
const outputFile = './src/gameData.ts';

function fileToBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

console.log('Converting build artifacts to base64...');

const gameJs = fileToBase64(path.join(buildDir, 'game.js'));
const gameData = fileToBase64(path.join(buildDir, 'game.data'));
const gameMem = fileToBase64(path.join(buildDir, 'game.js.mem'));

const tsContent = `
/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Contains base64 encoded game artifacts for the embedded runner.
 */

export const GAME_JS = ${gameJs ? `'${gameJs}'` : 'null'};
export const GAME_DATA = ${gameData ? `'${gameData}'` : 'null'};
export const GAME_MEM = ${gameMem ? `'${gameMem}'` : 'null'};
`;

fs.writeFileSync(outputFile, tsContent);
console.log(`Successfully generated ${outputFile}`);
