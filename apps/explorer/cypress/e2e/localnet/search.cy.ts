// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

Cypress.config('baseUrl', 'http://localhost:3000');

describe('search', () => {
    it('can search for an address', () => {
        cy.task('faucet').then((address) => {
            cy.visit('/');
            cy.get('[data-testid=search]').type(address).type('{enter}');
            cy.url().should('include', `/address/${address}`);
        });
    });

    it('can search for objects', () => {
        cy.task('faucet')
            .then((address) => cy.task('mint', address))
            .then((tx) => {
                if (!('EffectsCert' in tx)) {
                    throw new Error('Missing effects cert');
                }
                const { objectId } =
                    tx.EffectsCert.effects.effects.created![0].reference;
                cy.visit('/');
                cy.get('[data-testid=search]').type(objectId).type('{enter}');
                cy.url().should('include', `/object/${objectId}`);
            });
    });

    it('can search for transaction', () => {
        cy.task('faucet')
            .then((address) => cy.task('mint', address))
            .then((tx) => {
                if (!('EffectsCert' in tx)) {
                    throw new Error('Missing effects cert');
                }
                const txid = tx.EffectsCert.certificate.transactionDigest;
                cy.visit('/');
                cy.get('[data-testid=search]').type(txid).type('{enter}');
                cy.url().should('include', `/transaction/${txid}`);
            });
    });
});
