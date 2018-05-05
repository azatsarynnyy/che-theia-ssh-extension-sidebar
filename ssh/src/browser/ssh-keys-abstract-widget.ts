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

import { h, VirtualNode } from '@phosphor/virtualdom';
import { VirtualWidget, VirtualRenderer, SingleTextInputDialog } from '@theia/core/lib/browser';
import { SshKeyServer, SshKeyPair } from '../common/ssh-protocol';

export abstract class SshKeysAbstractWidget extends VirtualWidget {

    protected keyPairs: SshKeyPair[] = [];

    constructor(
        protected readonly service: string,
        protected readonly sshKeyServer: SshKeyServer
    ) {
        super();
        this.addClass('theia-ssh');
        this.update();
        this.fetchKeys();
    }

    protected async fetchKeys() {
        this.keyPairs = await this.sshKeyServer.list(this.service, undefined);
        this.update();
    }

    protected render(): h.Child {
        const commandBar = this.renderCommandBar();
        const keyList = this.renderKeyList();
        return [commandBar, keyList];
    }

    protected renderCommandBar(): VirtualNode {
        const generateButton = h.button({
            className: 'theia-button',
            title: 'Generate new SSH key pair',
            onclick: async () => {
                const name = await this.getNewKeyPairName();
                await this.sshKeyServer.generate(this.service, name);
                this.fetchKeys();
            }
        }, 'Generate...');
        const uploadButton = h.button({
            className: 'theia-button',
            title: 'Upload public key',
            onclick: () => { }
        }, 'Upload...');
        return h.div({ className: 'buttons' }, generateButton, uploadButton);
    }

    /**
     * Returns name for new key pair, e.g. by asking user input.
     */
    protected abstract async getNewKeyPairName(): Promise<string>

    protected renderKeyList(): VirtualNode {
        const children = this.keyPairs.map(keyPair => {
            return this.renderKey(keyPair)
        });

        return h.div({
            id: 'keyListContainer'
        }, VirtualRenderer.flatten(children));
    }

    protected renderKey(keyPair: SshKeyPair): VirtualNode {
        const name = h.div({
            className: 'keyName'
        }, keyPair.name);

        const dialog = new SingleTextInputDialog({
            title: `Public key of '${keyPair.name}'`,
            initialValue: keyPair.publicKey
        });
        const viewButton = h.button({
            className: 'theia-button',
            title: 'View public key',
            onclick: () => dialog.open()
            //this.commandService.executeCommand(CommonCommands.COPY.id)
        }, 'View');

        const deleteButton = h.button({
            className: 'theia-button',
            title: 'Delete key pair',
            onclick: async () => {
                if (await this.shouldDelete(keyPair)) {
                    await this.sshKeyServer.delete(keyPair.service, keyPair.name);
                    this.fetchKeys();
                }
            }
        }, 'Delete...');

        return h.div({
            className: 'sshItem'
        }, name, viewButton, deleteButton);
    }

    /**
     * Tests whether the given SSH key pair should be deleted.
     * @param keyPair SSH key pair to delete
     */
    protected abstract shouldDelete(keyPair: SshKeyPair): Promise<boolean>
}
