import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { Environment, ServerErrorCodes } from '@mockoon/commons';
import {
    createLoggerInstance,
    listenServerEvents,
    MockoonServer,
    ServerMessages
  } from '@mockoon/commons-server';
import fs from 'fs';
import { join } from 'path';
import { format } from 'util';
import { Config } from './config';
import { commonFlags, deprecatedFlags } from './constants/command.constants';
import { parseDataFiles, prepareEnvironment } from './libs/data';
import { getDirname, transformEnvironmentName } from './libs/utils';
dotenv.config();

interface ServerParameters {
    environment: Environment;
    environmentDir: string;
    logTransaction?: boolean;
    fileTransportOptions?: Parameters<typeof createLoggerInstance>[0] | null;
}

class Application {
    private app: Express = express()
    private port: number = 8080
    private mockoonServer?: MockoonServer

    public runApplication = async () => {
        this.mockoonServer = await this.runMockoon("./resources/mock1.json");
        console.log("Run Mockoon finished")
        this.app.get('/', async (req: Request, res: Response) => {
            res.status(200)
            res.send('Express + TypeScript Server');
        });
        this.app.patch("/env/:envName", async (req: Request, res: Response) => {
            let newEnvName = req.params["envName"]
            if (!fs.existsSync(`./resources/${newEnvName}`)) {
                res.status(404)
                res.send(`Not found file ./resources/${newEnvName}`)
            } else
                try {
                    this.mockoonServer?.stop();
                    this.mockoonServer = await this.runMockoon(`./resources/${newEnvName}`);
                    res.status(200)
                    res.json(`Patched mockoon server to use resources/${newEnvName}`)
                } catch {
                    res.status(500)
                    res.send("Error happened when patch new env to mockoon")
                }
        })
        this.app.delete('/stop', async (req: Request, res: Response) => {
            if (this.mockoonServer) {
                this.mockoonServer.stop()
                res.status(200)
                res.send('Stopped Mockoon Server');
            } else {
                res.status(400)
                res.send('Mockoon Server have not started yet!')
            }
                
        });
        this.app.listen(this.port, () => {
            console.log(`⚡️[server]: Server is running at http://localhost:${this.port}`);
        });
    }
    private runMockoon= async (envFilePath: string): Promise<MockoonServer> => {
        try {
          const parsedEnvironment = await parseDataFiles(envFilePath);
        try {
            parsedEnvironment.environment = await prepareEnvironment({
            environment: parsedEnvironment.environment,
            userOptions: {
                hostname: "localhost",
                port: 3001
            },
            repair: false
            });
        } catch (error: any) {
            return Promise.reject(null)
        }
        let mockoonServer = this.createServer({
            environment: parsedEnvironment.environment,
            environmentDir: getDirname(parsedEnvironment.originalPath) || '',
            logTransaction: false,
            fileTransportOptions: false
            ? null
            : {
                filename: join(
                    Config.logsPath,
                    `${transformEnvironmentName(
                        parsedEnvironment.environment.name
                    )}.log`
                )
                }
        });
        return Promise.resolve(mockoonServer)
        } catch (error: any) {
        //   this.error(error.message);
            return Promise.reject(null)
        }
    }
    private createServer = (parameters: ServerParameters): MockoonServer => {
        const logger = createLoggerInstance(parameters.fileTransportOptions);
        const server = new MockoonServer(parameters.environment, {
          environmentDirectory: parameters.environmentDir
        });
    
        listenServerEvents(
          server,
          parameters.environment,
          logger,
          parameters.logTransaction
        );
        
        server.on('error', (errorCode, originalError) => {
          const exitErrors = [
            ServerErrorCodes.PORT_ALREADY_USED,
            ServerErrorCodes.PORT_INVALID,
            ServerErrorCodes.HOSTNAME_UNAVAILABLE,
            ServerErrorCodes.HOSTNAME_UNKNOWN,
            ServerErrorCodes.CERT_FILE_NOT_FOUND,
            ServerErrorCodes.UNKNOWN_SERVER_ERROR
          ];
    
          let errorMessage: string | undefined = originalError?.message;
    
          switch (errorCode) {
            case ServerErrorCodes.PORT_ALREADY_USED:
            case ServerErrorCodes.PORT_INVALID:
              errorMessage = format(
                ServerMessages[errorCode],
                parameters.environment.port
              );
              break;
            case ServerErrorCodes.UNKNOWN_SERVER_ERROR:
              errorMessage = format(
                ServerMessages[errorCode],
                originalError?.message
              );
              break;
            case ServerErrorCodes.CERT_FILE_NOT_FOUND:
              errorMessage = ServerMessages[errorCode];
              break;
            case ServerErrorCodes.HOSTNAME_UNAVAILABLE:
            case ServerErrorCodes.HOSTNAME_UNKNOWN:
              errorMessage = format(
                ServerMessages[errorCode],
                parameters.environment.hostname
              );
              break;
          }
    
          // Cannot use this.error() as Oclif does not catch it (it seems to be lost due to the async nature of Node.js http server.listen errors).
          if (exitErrors.includes(errorCode)) {
            // this.log(`${chalkRed(' »')}   Error: ${errorMessage}`);
            // process.exit(2);
          }
        });
    
        process.on('SIGINT', () => {
          server.stop();
        });
    
        server.start();
        return server;
    };
}

(async () => {
    let myApp = new Application();
    await myApp.runApplication();
})()
