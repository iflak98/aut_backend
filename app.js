import bodyParser from 'body-parser';
import child_process from 'child_process';
import cors from 'cors';
import express from 'express';
import { readdirSync, existsSync, readdir } from 'fs';
import process from 'process';
import fs from 'fs-extra';
// import zipper from 'zip-local';
import http from 'http';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import log4js from 'log4js';
import dotenv from 'dotenv';




log4js.configure({
    appenders: {
        file: {
            type: "file",
            filename: "logs.log"
        }
    },

    categories: {
        default: {
            appenders:
                ["file"],
            level: "info"
        }
    },

});




const logger = log4js.getLogger();
dotenv.config();

const app = express();

const installationPath = `${process.env.INSTALLATION_PATH_FE}` + '\\\\src\\\\app';
const COVERAGE_PATH = `${process.env.PROJECT_COVERAGE_RELATIVE_PATH}`;
const INITIAL_CWD = process.cwd();

var filePath = '';
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(cors());

app.get('/getData', (req, res) => {
    res.send({
        "statusCode": 200,
        "statusMessage": "SUCCESS1"
    })
});

app.get("/logs", (req, res) => {



    // Read logs from file
    console.log('inside logs');
    console.log("Current directory:", process.cwd());
    process.chdir(INITIAL_CWD);
    console.log("Current directory:", process.cwd());
    const logs = fs.readFileSync("logs.log", "utf8");

    // Return logs as a JSON response

    res.json({ logs: logs });

});

app.post("/generateMultiple", function (req, res) {
    const start = Date.now();
    filePath = req.body;
    let files = [];
    try {
        files = generateMultiple(filePath);
        console.log(files);
        let timeTaken = Date.now() - start;

        console.log("Total time taken : " + timeTaken + " milliseconds");
        res.status(200).json({
            time: timeTaken,
            files: files
        });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            message: 'Invalid Path'
        })
    } finally {

    }



});

app.post("/generateSingle", function (req, res) {
    const start = Date.now();
    filePath = req.body;
    let files = [];
    try {
        files = generateSingle(filePath);
        console.log(files);
        let timeTaken = Date.now() - start;

        console.log("Total time taken : " + timeTaken + " milliseconds");
        res.status(200).json({
            time: timeTaken,
            files: files
        });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            message: 'Invalid Path'
        })
    }



});

app.post("/runTest/single", function (req, res) {
    let start = Date.now();
    filePath = req.body;

    let result = getReportSingle(filePath);

    // console.log(files);
    let timeTaken = Date.now() - start;

    console.log("Total time taken : " + timeTaken + " milliseconds");
    res.status(200).json({
        time: timeTaken,
        // files: files
    });

});

app.post("/runTest/multiple", function (req, res) {
    let start = Date.now();
    filePath = req.body;

    let result = getReportMultiple(filePath);

    // console.log(files);
    let timeTaken = Date.now() - start;

    console.log("Total time taken : " + timeTaken + " milliseconds");
    res.status(200).json({
        time: timeTaken,
        // files: files
    });

});

app.post("/generateCoverage", function (req, res) {

    console.log('after response');
    let dirName = req.body;
    const projectPath = dirName.substring(0, dirName.lastIndexOf('\\src'));
    console.log('ProjectPath: ', projectPath);
    if (!!projectPath) {
        console.log('Changed directory to ' + `${dirName}`);
        process.chdir(`${projectPath}`);
    } else {
        console.log('Changed directory to ' + `${dirName}`);
        process.chdir(`${dirName}`);
    }
    projectPath ? process.chdir(`${projectPath}`) : process.chdir(`${dirName}`);
    let covDir = !!projectPath ? projectPath + COVERAGE_PATH : dirName + COVERAGE_PATH;

    const items = readdirSync(covDir, { withFileTypes: true });

    let tempDir = `${installationPath}` + '\\local-coverage';

    covDir = covDir.replace(/\\/g, '/');

    tempDir = tempDir.replace(/\\/g, '/');

    console.log('Copying ');
    fs.copySync(covDir, tempDir);

    const tempDirectory = `${installationPath}` + '\\local-coverage';

    process.chdir(`${tempDirectory}`);

    readdir(`${tempDir}`, (err, html) => {

        if (err) {
            console.log('path', err)
            res.status(400).send({ message: 'Incorrect path mention for coverage report' });
        }

        if (html) {
            console.log('html', html);

            var serve = serveStatic("./");

            var server = http.createServer(function (req, res) {

                var done = finalhandler(req, res);

                serve(req, res, done);

            });

            server.listen(8000).on('error', () => {

                console.log('Already running on 8000');

            });
            res.status(200).send({});
        }

    });

})

app.listen(3000, (req, res) => {
    console.log('Express api is running at port 3000');
})

const generateMultiple = (dirName) => {
    let files = [];
    const foldersToIgnore = ['node_modules', '.git', 'assets', 'environments'];
    const filesToIgnore = ['main.ts', 'polyfills.ts', 'test.ts'];

    const items = readdirSync(dirName, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory() && !foldersToIgnore.includes(item.name)) {
            console.log('if', `${dirName}/${item.name}`)

            files = [...files, ...generateMultiple(`${dirName}/${item.name}`)];
        } else {
            if (item.name.endsWith('.ts') && !item.name.endsWith('spec.ts') && !item.name.endsWith('module.ts') && !filesToIgnore.includes(item.name)) {
                // files.push(`${dirName}/${item.name}`);
                console.log('Generating unit testing file for ', `${item.name}`, '\n');
                logger.info('Generating unit testing file for ', `${item.name}`, '\n');

                process.chdir(`${dirName}`);

                let specFileName = item.name.substring(0, item.name.length - 3) + '.spec.ts';

                const execSync = child_process.execSync;

                if (existsSync(specFileName)) { //check if spec file already exists
                    execSync('del ' + specFileName); //delete existing spec file
                }
                console.log('install', `${installationPath}`)

                execSync('copy ' + `${item.name}` + ' ' + `${installationPath}` + '\\temp');//copy ts file to AUT temp folder
                process.chdir(`${installationPath}` + '\\temp');//changed directory to AUT tempfolder
                const fullpath = (`${dirName}` + '\\' + `${item.name}`).replace(/\//g, "\\");
                const output = execSync('ngentest ' + `${item.name}` + ' -s', { encoding: 'utf-8' });//Running ngentest 
                try {
                    let dirFormatted = dirName.replace(/\//g, "\\");
                    execSync('copy ' + `${specFileName}` + ' ' + `${dirFormatted}`);//copy generated spec file to ts file's path inside actual project 
                    console.log('Generated ' + `${specFileName}` + ' at ' + `${dirFormatted}`);
                    logger.info('Generated ' + `${specFileName}` + ' at ' + `${dirFormatted}`)
                    execSync('del ' + specFileName);  //delete spec file from AUT temp folder
                    execSync('del ' + `${item.name}`);//delete ts file from AUT temp folder
                    files.push(`${dirName}/${item.name}`);
                } catch (e) {
                    logger.error('error while generating' + `${specFileName}` + ' at ' + `${dirFormatted}`);
                }


            }
        }
    }

    return files;
};

const generateSingle = (dirName) => {
    console.log('dirname', dirName);
    const fileName = dirName.substring(dirName.lastIndexOf('\\') + 1, dirName.length);
    dirName = dirName.substring(0, dirName.lastIndexOf('\\'));
    let files = [];
    console.log('dirName', dirName);
    const foldersToIgnore = ['node_modules', '.git', 'assets', 'environments'];
    const filesToIgnore = ['main.ts', 'polyfills.ts', 'test.ts'];
    const items = readdirSync(dirName, { withFileTypes: true });
    console.log('items', items);
    for (const item of items) {
        if (item.isDirectory() && !foldersToIgnore.includes(item.name)) {
            console.log('if', `${dirName}/${item.name}`)
            // files = [...files, ...generateSingle(`${dirName}/${item.name}`)];
        } else {
            console.log('else')

            if (item.name.endsWith('.ts') && !item.name.endsWith('spec.ts') && !item.name.endsWith('module.ts') && !item.name.endsWith('model.ts') && !filesToIgnore.includes(item.name)) {
                console.log('>>  ', `${dirName}` + '\\' + `${item.name}`, '\n');
                console.log('Generating unit testing file for ', `${item.name}`, '\n');

                process.chdir(`${dirName}`);

                let specFileName = item.name.substring(0, item.name.length - 3) + '.spec.ts';

                const execSync = child_process.execSync;
                if (existsSync(specFileName)) { //check if spec file already exists
                    execSync('del ' + specFileName); //delete existing spec file
                }
                execSync('copy ' + `${item.name}` + ' ' + `${installationPath}` + '\\temp'); //copy ts file to AUT temp folder
                process.chdir(`${installationPath}` + '\\temp');//changed directory to AUT tempfolder
                try {
                    const output = execSync('ngentest ' + `${dirName}` + '\\' + `${item.name}` + ' -s', { encoding: 'utf-8' }); //Running ngentest 
                    console.log('ngentest ' + `${item.name}` + ' -s')
                    let dirFormatted = dirName.replace(/\//g, "\\");
                    console.log(dirFormatted);
                    execSync('copy ' + `${specFileName}` + ' ' + `${dirFormatted}`);//copy generated spec file to ts file's path inside actual project 
                    console.log('Generated ' + `${specFileName}` + ' at ' + `${dirFormatted}`);
                    execSync('del ' + specFileName); //delete spec file from AUT temp folder
                    execSync('del ' + `${item.name}`); //delete ts file from AUT temp folder
                    files.push(`${dirName}/${item.name}`);
                    console.log('files-->', files)
                } catch (e) {
                    console.log('Error while generating unit test file');
                    logger.error('error while generating' + `${specFileName}` + ' at ' + `${dirFormatted}`);

                } finally {
                    console.log('Finaally');
                }
            }
        }
    }

    return files;
};

const getReportSingle = (dirName) => {

    const fileName = dirName.substring(dirName.lastIndexOf('\\') + 1, dirName.length);
    dirName = dirName.substring(0, dirName.lastIndexOf('\\'));
    const projectPath = dirName.substring(0, dirName.lastIndexOf('\\src'));
    console.log(projectPath);
    let projectPathBeforefile = dirName.substring(dirName.lastIndexOf('src'), dirName.length);
    console.log(projectPathBeforefile);
    projectPathBeforefile = projectPathBeforefile.replace(/\\/g, '/');

    const specFileName = fileName.substring(0, fileName.length - 3) + '.spec.ts';
    console.log('specFileName', specFileName);

    console.log(dirName, '  >>  ', fileName);

    process.chdir(`${projectPath}`);

    console.log('Changed directory to' + `${projectPath}`);

    try {

        const execSync = child_process.execSync;
        console.log('running ' + `npm run test -- --include ` + `${projectPathBeforefile}` + '/' + `${specFileName}` + ` --code-coverage`)
        logger.info('running ' + `npm run test -- --include ` + `${projectPathBeforefile}` + '/' + `${specFileName}` + ` --code-coverage`)
        execSync(`npm run test -- --include ` + `${projectPathBeforefile}` + '/' + `${specFileName}` + ` --code-coverage`);

    } catch (e) {

        console.log(e);

    } finally {

        console.log('Output');

        let covDir = projectPath + COVERAGE_PATH;

        const items = readdirSync(covDir, { withFileTypes: true });

        let tempDir = `${installationPath}` + '\\local-coverage';

        covDir = covDir.replace(/\\/g, '/');

        tempDir = tempDir.replace(/\\/g, '/');

        fs.copySync(covDir, tempDir);

        // process.chdir(`${tempDir}`);
        // zipper.sync.zip("").compress().save("coverage.zip");
        console.log('Done getReportSingle');
        return 'done';

    }



}

const getReportMultiple = (dirName) => {

    const projectPath = dirName.substring(0, dirName.lastIndexOf('\\src')) ? dirName.substring(0, dirName.lastIndexOf('\\src')) : dirName;
    console.log('ProjectPath: ', projectPath);
    process.chdir(`${dirName}`);
    console.log('Changed directory to ' + `${dirName}`);

    try {

        const execSync = child_process.execSync;
        console.log('Running ' + `ng test --code-coverage`);
        const res = execSync(`ng test --code-coverage`);
        console.log('\n\n', res);

    } catch (e) {

        console.log(e);

    } finally {

        let covDir = projectPath + COVERAGE_PATH;

        const items = readdirSync(covDir, { withFileTypes: true });

        let tempDir = `${installationPath}` + '\\local-coverage';

        covDir = covDir.replace(/\\/g, '/');

        tempDir = tempDir.replace(/\\/g, '/');

        console.log('Copying ');
        fs.copySync(covDir, tempDir);


        // process.chdir(`${tempDir}`);
        // zipper.sync.zip("").compress().save("coverage.zip");
        console.log('Done getReportMultiple');
        return covDir;

    }



}



