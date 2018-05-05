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
import { Command, CommandRegistry, CommandContribution } from '@theia/core';
import { SshQuickOpenService } from './ssh-quick-open-service';

export namespace SshCommands {
    export const SSH_GENERATE: Command = {
        id: 'ssh:generate',
        label: 'SSH: generate key pair...'
    };
    export const SSH_CREATE: Command = {
        id: 'ssh:create',
        label: 'SSH: create key pair...'
    };
    export const SSH_COPY: Command = {
        id: 'ssh:copy',
        label: 'SSH: copy public key to clipboard...'
    };
    export const SSH_DELETE: Command = {
        id: 'ssh:delete',
        label: 'SSH: delete key pair...'
    };
}

@injectable()
export class SshFrontendContribution implements CommandContribution {

    constructor(
        @inject(SshQuickOpenService) protected readonly sshQuickOpenService: SshQuickOpenService
    ) { }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SshCommands.SSH_GENERATE, {
            isEnabled: () => true,
            execute: () => this.sshQuickOpenService.generateKeyPair()
        });
        commands.registerCommand(SshCommands.SSH_CREATE, {
            isEnabled: () => true,
            execute: () => this.sshQuickOpenService.createKeyPair()
        });
        commands.registerCommand(SshCommands.SSH_COPY, {
            isEnabled: () => true,
            execute: () => this.sshQuickOpenService.copyPublicKey()
        });
        commands.registerCommand(SshCommands.SSH_DELETE, {
            isEnabled: () => true,
            execute: () => this.sshQuickOpenService.deleteKeyPair()
        });
    }
}
