'use strict';

const TST_ID = 'treestyletab@piro.sakura.ne.jp';

async function registerToTST() {
    try {
        const result = await browser.runtime.sendMessage(TST_ID, {
            type: 'register-self',

            name:  browser.i18n.getMessage('tst-tabcount'),
            icons: browser.runtime.getManifest().icons,

            listeningTypes: [
                'sidebar-show',
                'tabs-rendered',
                'tree-attached',
                'tree-detached',
                'wait-for-shutdown',
            ],
            allowBulkMessaging: true,

            style: `
            ::part(%EXTRA_CONTENTS_PART% tab-counter) {
                background: black;
                color: Orange;
                opacity: .7;
                font-size: xx-small;
                right: .1em;
                padding: 0.1em;
                pointer-events: none;
                position: absolute;
                bottom: 0.1em;
                z-index: 200;
            }
          `,
            permissions: [
            ],

        });
    }
    catch(_error) {
    }
}
registerToTST();
refreshTabNumbers();

async function uninitFeaturesForTST() {
}
async function waitForTSTShutdown() {
    try {
        await browser.runtime.sendMessage(TST_ID, { type: 'wait-for-shutdown' });
    } catch (error) {
        // Extension was disabled before message was sent:
        if (error.message.startsWith('Could not establish connection. Receiving end does not exist.'))
            return true;
        // Extension was disabled while we waited:
        if (error.message.startsWith('Message manager disconnected'))
            return true;
        // Probably an internal Tree Style Tab error:
        throw error;
    }
}

function onMessageExternal(message, sender) {
    if (sender.id == TST_ID) {
        if (message && message.messages) {
            for (const oneMessage of message.messages) {
                onMessageExternal(oneMessage, sender);
            }
        }
        switch (message && message.type) {
            case 'ready':
                registerToTST();
                break;

            case 'wait-for-shutdown':
                return new Promise(() => {});

        }
    }
}

function insertContents(tabId, content = tabId) {
    var formattedContents = '<small id="tab-counter" part="tab-counter">' + content + '</small>';
    browser.runtime.sendMessage(TST_ID, {
        type:     'set-extra-contents',
        place:    'tab-front',
        part:     'tab-counter',
        tab:      tabId,
        contents: formattedContents
    });
}

async function refreshTabNumbers() {
    let tabs = await browser.runtime.sendMessage(TST_ID, {
        type:   'get-light-tree',
        tabs:   '*',
    });
    for (const [index, tab] of tabs.entries()) {
        insertContents(tab.id, index + 1);
    }
}

browser.runtime.onMessageExternal.addListener(async (message, sender) => {
    let tabs = [];
    switch (sender.id) {
        case TST_ID:
            switch (message.type) {
                case 'ready':
                    refreshTabNumbers();
                    break;

                case 'tree-attached':
                    refreshTabNumbers();
                    break;

                case 'tree-detached':
                    refreshTabNumbers();
                    break;

                case 'sidebar-show':
                    refreshTabNumbers();
                    break;

                case 'permissions-changed':
                    registerToTST();
                    break;

                case 'tabs-rendered':
                    for (const tab of message.tabs) {
                        insertContents(tab.id, tab.index + 1);
                    }
            }
            break;
    }
});

waitForTSTShutdown().then(uninitFeaturesForTST);

