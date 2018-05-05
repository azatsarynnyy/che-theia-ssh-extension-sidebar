/*
 * Copyright (c) 2012-2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { inject, injectable } from "inversify";
import { QuickOpenService, QuickOpenModel, QuickOpenItem } from '@theia/core/lib/browser/quick-open/';
import { SshKeyServer } from "../common/ssh-protocol";
import { QuickOpenOptions, QuickOpenMode } from "@theia/core/lib/browser";
import { MessageService } from "@theia/core";

/**
 * Enumeration of the Che services which can use SSH key pairs.
 */
export const enum Service {
    VCS = 'vcs',
    MACHINE = 'machine'
}

@injectable()
export class SshQuickOpenService {

    constructor(
        @inject(QuickOpenService) protected readonly quickOpenService: QuickOpenService,
        @inject(SshKeyServer) protected readonly sshKeyServer: SshKeyServer,
        @inject(MessageService) protected readonly messageService: MessageService
    ) { }

    generateKeyPair(): void {
        const execute = (service: string, name: string) => {
            this.sshKeyServer.generate(service, name);
        }
        this.askServiceAndName('Pick a Che service to generate SSH key pair for', execute);

        // const execute = (item: SshServiceQuickOpenItem) => {
        //     const __this = this;
        //     const processNameModel: QuickOpenModel = {
        //         onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
        //             const dynamicItems: QuickOpenItem[] = [];

        //             if (lookFor === undefined || lookFor.length === 0) {
        //                 const executeNothing = (item: ProvideNameItem) => { }
        //                 const provideNameItem = new ProvideNameItem(executeNothing);
        //                 dynamicItems.push(provideNameItem);
        //             } else {
        //                 const executeGenerate = (item1: ProvideNameItem) => {
        //                     __this.sshKeyServer.generate(item.getLabel(), lookFor);
        //                 }
        //                 const provideNameItem = new ProvideNameItem(executeGenerate);
        //                 dynamicItems.push(provideNameItem);
        //             }
        //             acceptor(dynamicItems);
        //         }
        //     }

        //     this.quickOpenService.open(processNameModel, this.getOptions(`${item.getLabel()} key pair name`, false));
        // };

        // const items = [Service.VCS, Service.MACHINE].map(service => {
        //     return new SshServiceQuickOpenItem(service, execute)
        // });
        // this.open(items, 'Pick a Che service to generate SSH key pair for');
    }

    private askServiceAndName(placeholder: string, executeFn: (service: string, name: string) => void): void {
        const execute = (serviceItem: SshServiceQuickOpenItem) => {
            const processNameModel: QuickOpenModel = {
                onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
                    const dynamicItems: QuickOpenItem[] = [];

                    if (lookFor === undefined || lookFor.length === 0) {
                        const executeNothing = (item: ProvideNameItem) => { }
                        const provideNameItem = new ProvideNameItem(executeNothing);
                        dynamicItems.push(provideNameItem);
                    } else {
                        const provideNameItem = new ProvideNameItem((item: ProvideNameItem) => { executeFn(serviceItem.getLabel(), lookFor) });
                        dynamicItems.push(provideNameItem);
                    }
                    acceptor(dynamicItems);
                }
            }

            this.quickOpenService.open(processNameModel, this.getOptions(`${serviceItem.getLabel()} key pair name`, false));
        };

        const items = [Service.VCS, Service.MACHINE].map(service => {
            return new SshServiceQuickOpenItem(service, execute)
        });
        this.open(items, placeholder);
    }

    createKeyPair(): void {
        const execute = (service: string, name: string) => {
            const __this = this;
            const processNameModel: QuickOpenModel = {
                onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
                    const dynamicItems: QuickOpenItem[] = [];

                    if (lookFor === undefined || lookFor.length === 0) {
                        const executeNothing = (item: ProvidePublicKeyItem) => { }
                        const provideKeyItem = new ProvidePublicKeyItem(executeNothing);
                        dynamicItems.push(provideKeyItem);
                    } else {
                        const executeFn = (item: ProvidePublicKeyItem) => {
                            __this.sshKeyServer.create(service, name, lookFor);
                        }
                        const provideKeyItem = new ProvidePublicKeyItem(executeFn);
                        dynamicItems.push(provideKeyItem);
                    }
                    acceptor(dynamicItems);
                }
            }
            this.quickOpenService.open(processNameModel, this.getOptions('public key', false));
        }
        this.askServiceAndName('Pick a Che service to upload public key for', execute);
    }

    async copyPublicKey(): Promise<void> {
        const [vcsKeys, machineKeys] = await Promise.all(
            [
                this.sshKeyServer.list(Service.VCS, undefined),
                this.sshKeyServer.list(Service.MACHINE, undefined)
            ]);

        if (vcsKeys.length === 0) {
            this.messageService.info('There are no SSH keys to copy');
            return;
        }

        const execute = (item: SshKeyPairQuickOpenItem) => {
            // TODO
            // document.execCommand('copy');
        };

        const vcsKeyItems = vcsKeys.map(keyPair => new SshKeyPairQuickOpenItem(keyPair.name, keyPair.service, execute));
        const machineKeyItems = machineKeys.map(keyPair => new SshKeyPairQuickOpenItem(keyPair.name, keyPair.service, execute));

        this.open([...vcsKeyItems, ...machineKeyItems], 'Choose key pair to copy its public key to clipboard');
    }

    async deleteKeyPair(): Promise<void> {
        const [vcsKeys, machineKeys] = await Promise.all(
            [
                this.sshKeyServer.list(Service.VCS, undefined),
                this.sshKeyServer.list(Service.MACHINE, undefined)
            ]);

        if (vcsKeys.length === 0) {
            this.messageService.info('There are no SSH keys to delete');
            return;
        }

        const execute = (item: SshKeyPairQuickOpenItem) => this.sshKeyServer.delete(item.getDescription(), item.getLabel());

        const vcsKeyItems = vcsKeys.map(keyPair => new SshKeyPairQuickOpenItem(keyPair.name, keyPair.service, execute));
        const machineKeyItems = machineKeys.map(keyPair => new SshKeyPairQuickOpenItem(keyPair.name, keyPair.service, execute));

        this.open([...vcsKeyItems, ...machineKeyItems], 'Choose key pair to delete');
    }

    private open(items: QuickOpenItem | QuickOpenItem[], placeholder: string, lookForFunc?: (lookFor: string) => void): void {
        this.quickOpenService.open(this.getModel(Array.isArray(items) ? items : [items], lookForFunc), this.getOptions(placeholder));
    }

    private getModel(items: QuickOpenItem | QuickOpenItem[], lookForFunc?: (lookFor: string) => void): QuickOpenModel {
        return {
            onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
                if (lookForFunc) {
                    lookForFunc(lookFor);
                }
                acceptor(Array.isArray(items) ? items : [items]);
            }
        };
    }

    private getOptions(placeholder: string, fuzzyMatchLabel: boolean = true): QuickOpenOptions {
        return QuickOpenOptions.resolve({
            placeholder,
            fuzzyMatchLabel,
            fuzzySort: false
        });
    }
}

/**
 * Placeholder item for choosing a Che SSH service.
 */
export class SshServiceQuickOpenItem extends QuickOpenItem {
    constructor(
        protected readonly service: string,
        protected readonly execute: (item: SshServiceQuickOpenItem) => void
    ) {
        super();
    }

    getLabel(): string {
        return this.service;
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }
        this.execute(this);
        //return true;
        return false;
    }
}

/**
 * Placeholder item represents SSH key pair.
 */
export class SshKeyPairQuickOpenItem extends QuickOpenItem {

    constructor(
        protected readonly keyPairName: string,
        protected readonly service: string,
        protected readonly execute: (item: SshKeyPairQuickOpenItem) => void
    ) {
        super();
    }

    getLabel(): string {
        return this.keyPairName;
    }

    getDescription(): string {
        return this.service;
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }
        this.execute(this);
        return true;
    }
}

export class ProvideNameItem extends QuickOpenItem {
    constructor(
        protected readonly execute: (item: ProvideNameItem) => void
    ) {
        super();
    }

    getLabel(): string {
        return 'Please provide a key pair name';
    }

    getDescription(): string {
        return 'e.g. github.com';
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }
        this.execute(this);
        // return true;
        return false;
    }
}

export class ProvidePublicKeyItem extends QuickOpenItem {
    constructor(
        protected readonly execute: (item: ProvidePublicKeyItem) => void
    ) {
        super();
    }

    getLabel(): string {
        return 'Please provide a public key';
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }
        this.execute(this);
        return true;
    }
}
