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

import { ConfirmDialog, SingleTextInputDialog } from '@theia/core/lib/browser';
import { SshKeysAbstractWidget } from './ssh-keys-abstract-widget';
import { SshKeyServer, SshKeyPair } from '../common/ssh-protocol';

export class VcsSshKeysWidget extends SshKeysAbstractWidget {

    constructor(
        protected readonly sshKeyServer: SshKeyServer
    ) {
        super('vcs', sshKeyServer);
    }

    protected async getNewKeyPairName(): Promise<string> {
        const dialog = new SingleTextInputDialog({
            title: `New SSH key pair`,
            initialValue: 'Remote host name/IP, e.g. github.com',
            validate: (input) => this.validateHostName(input)
        });
        return dialog.open();
    }

    protected validateHostName(host: string): string {
        const hostNameIpExpr = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/;
        if (!hostNameIpExpr.test(host)) {
            return "Invalid host name/IP, try other";
        }
        return '';
    }

    protected shouldDelete(keyPair: SshKeyPair): Promise<boolean> {
        const dialog = new ConfirmDialog({
            title: 'Delete SSH key pair',
            msg: `Do you really want to delete SSH keys for '${keyPair.name}' host?`,
            ok: 'Yes',
            cancel: 'No'
        });
        return dialog.open();
    }
}
