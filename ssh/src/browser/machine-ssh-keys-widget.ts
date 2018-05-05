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

export class MachineSshKeysWidget extends SshKeysAbstractWidget {

    constructor(
        protected readonly sshKeyServer: SshKeyServer
    ) {
        super('machine', sshKeyServer);
    }

    protected async getNewKeyPairName(): Promise<string> {
        const dialog = new SingleTextInputDialog({
            title: `New SSH key pair`,
            initialValue: 'Key pair title'
        });
        return dialog.open();
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
}
