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

import { injectable, inject } from 'inversify';
import { Message } from '@phosphor/messaging';
import { h, VirtualNode } from '@phosphor/virtualdom';
import { MessageService } from '@theia/core';
import { VirtualWidget, VirtualRenderer, OpenerService, ConfirmDialog, SingleTextInputDialog } from '@theia/core/lib/browser';
import { SshKeyServer, SshKeyPair } from '../common/ssh-protocol';
// import { SshKeyPairUri } from './ssh-key-pair-uri';

export const SSH_KEYS_WIDGET_FACTORY_ID = 'ssh-key-pairs';

@injectable()
export class SshWidget extends VirtualWidget {

    protected vcsKeyPairs: SshKeyPair[] = [];
    protected machineKeyPairs: SshKeyPair[] = [];

    constructor(
        @inject(SshKeyServer) protected readonly sshKeyServer: SshKeyServer,
        @inject(OpenerService) protected readonly openerService: OpenerService,
        @inject(MessageService) protected readonly messageService: MessageService
    ) {
        super();
        this.id = 'theia-sshContainer';
        this.title.label = 'SSH';
        this.addClass('theia-ssh');
        this.update();
        this.fetchKeys();
    }

    protected async fetchKeys() {
        const vcsKeyPairs = await this.sshKeyServer.list('vcs', undefined);
        this.vcsKeyPairs = [...vcsKeyPairs];

        const machineKeyPairs = await this.sshKeyServer.list('machine', undefined);
        this.machineKeyPairs = [...machineKeyPairs];

        this.update();
    }

    protected render(): h.Child {
        const vcsKeys = this.renderVcsKeys();
        const machineKeys = this.renderMachineKeys();
        return h.div({ className: "keyPairsOuterContainer" }, vcsKeys, machineKeys);
    }

    protected renderVcsKeys(): VirtualNode {
        const keyPairDivs = this.vcsKeyPairs.map(keyPair => this.renderKeyPairItem(keyPair));
        const headerDiv = this.renderHeader('vcs');
        return h.div({ className: 'keyPairsContainer' }, headerDiv, VirtualRenderer.flatten(keyPairDivs));
    }

    protected renderMachineKeys(): VirtualNode {
        const keyPairDivs = this.machineKeyPairs.map(keyPair => this.renderKeyPairItem(keyPair));
        const headerDiv = this.renderHeader('machine');
        return h.div({ className: 'keyPairsContainer' }, headerDiv, VirtualRenderer.flatten(keyPairDivs));
    }

    protected renderHeader(service: string): h.Child {
        const buttonsDiv = this.renderHeaderItemButtons(service);
        const buttonsContainerDiv = h.div({ className: 'itemButtonsContainer' }, buttonsDiv);
        return h.div({
            className: 'theia-header keyPairServiceItem flexcontainer noselect'
        }, `${service} keys`, buttonsContainerDiv);
    }

    protected renderHeaderItemButtons(service: string): h.Child {
        const buttons: h.Child[] = [];
        buttons.push(h.a({
            className: 'toolbar-button',
            title: `Generate SSH key pair for ${service}`,
            onclick: async event => {
                const name = await this.getNewKeyPairName();
                try {
                    await this.sshKeyServer.generate(service, name);
                } catch (error) {
                    this.messageService.error(`Couldn't generate SSH key pair '${name}'. ${error}`);
                }
                this.fetchKeys();
            }
        }, h.i({ className: 'fa fa-plus' })));
        return h.div({ className: 'buttons' }, VirtualRenderer.flatten(buttons));
    }

    protected async getNewKeyPairName(): Promise<string> {
        const dialog = new SingleTextInputDialog({
            title: `New SSH key pair`,
            initialValue: 'key pair title'
        });
        return dialog.open();
    }

    protected renderKeyPairItem(keyPair: SshKeyPair): h.Child {
        const nameSpan = h.span({ className: 'name' }, keyPair.name + ' ');
        const iconAndNameDiv = h.div({
            className: 'noWrapInfo',
            onclick: () => {
                // const uri = SshKeyPairUri.toUri(keyPair.service, keyPair.name);
                // open(this.openerService, uri);
            }
        }, nameSpan);
        const buttonsDiv = this.renderKeyPairItemButtons(keyPair);
        const itemButtonsDiv = h.div({ className: 'itemButtonsContainer' }, buttonsDiv);
        return h.div({ className: 'keyPairItem noselect' }, iconAndNameDiv, itemButtonsDiv);
    }

    protected renderKeyPairItemButtons(keyPair: SshKeyPair): h.Child {
        const buttons: h.Child[] = [];
        buttons.push(h.a({
            className: 'toolbar-button',
            title: 'Copy public key to clipboard',
            onclick: event => {
                // TODO
                document.execCommand('copy');
                this.messageService.info('Public key has been copied to clipboard.');
            }
        }, h.i({ className: 'fa fa-clipboard' })));
        buttons.push(h.a({
            className: 'toolbar-button',
            title: 'Delete key pair',
            onclick: async event => {
                if (await this.shouldDelete(keyPair)) {
                    try {
                        await this.sshKeyServer.delete(keyPair.service, keyPair.name);
                    } catch (error) {
                        this.messageService.error(`Couldn't delete SSH key pair '${keyPair.name}'. ${error}`);
                    }
                    this.fetchKeys();
                }
            }
        }, h.i({ className: 'fa fa-minus' })));
        return h.div({ className: 'buttons' }, VirtualRenderer.flatten(buttons));
    }

    protected shouldDelete(keyPair: SshKeyPair): Promise<boolean> {
        const dialog = new ConfirmDialog({
            title: 'Delete SSH key pair',
            msg: `Do you really want to delete '${keyPair.name}' SSH keys?`,
            ok: 'Yes',
            cancel: 'No'
        });
        return dialog.open();
    }

    // upload public key with d&d

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.addEventListener(this.node, 'dragenter', event => this.handleDragEnterEvent(event));
        this.addEventListener(this.node, 'dragover', event => this.handleDragOverEvent(event));
        this.addEventListener(this.node, 'dragleave', event => this.handleDragLeaveEvent(event));
        this.addEventListener(this.node, 'drop', event => this.handleDropEvent(event));
    }

    protected handleDragEnterEvent(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    protected handleDragOverEvent(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    protected handleDragLeaveEvent(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    protected handleDropEvent(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();

        const fileList = event.dataTransfer.files;
        const file = fileList.item(0);

        const reader = new FileReader();
        reader.onload = () => {
            this.sshKeyServer.create('vcs', file.name, reader.result);
            this.fetchKeys();
        };
        reader.readAsText(file, 'base64');
    }
}
