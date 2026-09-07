import {access,cp,readdir,rm,writeFile} from 'node:fs/promises';

// Validate the production pages before replacing generated hosting files.
await access('dist/index.html');
await access('dist/post-office.html');
const pages=(await readdir('dist')).filter(name=>name.endsWith('.html')).sort();
if(JSON.stringify(pages)!==JSON.stringify(['index.html','post-office.html']))throw Error('Unexpected pages in the production build');
await rm('docs',{recursive:true,force:true});
await cp('dist','docs',{recursive:true});
await writeFile('docs/.nojekyll','');
console.log('Prepared GitHub Pages in docs/');
