const express = require('express');
const { promises: fs } = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const cors = require('cors');

const execAsync = promisify(exec);

class PlaygroundService {
    constructor() {
        this.workspaceRoot = '/workspace/playground';
        // Templates are copied to /app/templates during docker build
        this.templatesPath = '/app/template_plutus';
    }

    async createWorkDir(type) {
        const workDir = path.join(this.workspaceRoot, `${type}-${uuidv4()}`);
        await fs.mkdir(workDir, { recursive: true });
       
        
        
        // Copy template files based on type
        if (type === 'haskell') {
            // run cabal init inplace without prompting for confirmation
            await execAsync('cabal init -n', {
                cwd: workDir
            });

        } else {
            await execAsync('cabal init -n', {
                cwd: workDir
            });
            const files = await fs.readdir(workDir);
            const cabalFile = files.find(file => file.endsWith('.cabal'));
            if (cabalFile) {
                await fs.unlink(path.join(workDir, cabalFile));
            }

            await fs.copyFile(
                path.join(this.templatesPath, 'playground-plutus.cabal'),
                path.join(workDir, 'playground-plutus.cabal')
            );
            await fs.copyFile(
                path.join(this.templatesPath, 'cabal.project'),
                path.join(workDir, 'cabal.project')
            );
        }
        
        return workDir;
    }

    async compileHaskell(sourceCode) {
        const workDir = await this.createWorkDir('haskell');
        
        try {
            
            await fs.writeFile(path.join(workDir, 'app/Main.hs'), sourceCode);

            // Compile with GHC
            const { stdout: compileOut, stderr: compileErr } = await execAsync('cabal run', {
                cwd: workDir,
                timeout: 10000,
                shell: '/bin/bash',
                env: { ...process.env }
            });

            // If there's a compilation error (not just warnings)
            if (compileErr && !compileErr.toLowerCase().includes('warning:')) {
                return {
                    success: false,
                    output: compileOut,
                    error: compileErr
                };
            }
            const outputLines = compileOut.split('\n');
            const linkingIndex = outputLines.findIndex(line => line.startsWith('[2 of 2] Linking'));
            const programOutput = outputLines.slice(linkingIndex + 1).join('\n').trim();

            return {
                success: true,
                output: programOutput,
                fullOutput: compileOut,
                warnings: compileErr // Include warnings if any
            };
           

        } catch (error) {
            console.error('Compilation error:', error);
            return {
                success: false,
                output: '',
                error: error.message
            };
        } finally {
            try {
                await fs.rm(workDir, { recursive: true, force: true });
            } catch (e) {
                console.error('Failed to cleanup:', e);
            }
        }
    }

    async compilePlutusTx(sourceCode) {
        const workDir = await this.createWorkDir('plutus');
            
        try {  
            await fs.writeFile(path.join(workDir, 'app/Main.hs'), sourceCode);

            // Run cabal build and run
            const { stdout: compileOut, stderr: compileErr } = await execAsync('cabal build && cabal run', {
                cwd: workDir,
                timeout: 60000,
                shell: '/bin/bash'
            });

            // If there's a compilation error (not just warnings)
            if (compileErr && !compileErr.toLowerCase().includes('warning:')) {
                return {
                    success: false,
                    output: compileOut,
                    error: compileErr
                };
            }

            // Extract program output (after linking)
            const outputLines = compileOut.split('\n');
            const linkingIndex = outputLines.findIndex(line => line.startsWith('[2 of 2] Linking'));
            const programOutput = outputLines.slice(linkingIndex + 1).join('\n').trim();

            return {
                success: true,
                output: programOutput,
                warnings: compileErr, // Include warnings if any
                fullOutput: compileOut
            };

        } catch (error) {
            console.error('Compilation error:', error);
            return {
                success: false,
                output: '',
                error: error.message
            };
        } finally {
            try {
                await fs.rm(workDir, { recursive: true, force: true });
            } catch (e) {
                console.error('Failed to cleanup:', e);
            }
        }
    }
}

const app = express();
const playground = new PlaygroundService();

app.use(express.json());


// add cors
app.use(cors({
    origin: '*'
}));



// path to test cabal version           
app.get('/cabal/version', async (req, res) => {
    const { stdout, stderr } = await execAsync('cabal --version');
    res.json({ stdout, stderr });
});

// path to test cabal version with bash as shell
app.get('/cabal/version/bash', async (req, res) => {
    const { stdout, stderr } = await execAsync('cabal --version', { shell: '/bin/bash' });
    res.json({ stdout, stderr });
});

app.post('/compile/:type(haskell|plutus)', async (req, res) => {
    const { type } = req.params;
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'No source code provided' });
    }

    try {
        const result = type === 'haskell' 
            ? await playground.compileHaskell(code)
            : await playground.compilePlutusTx(code);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Playground server running on port ${PORT}`);
});