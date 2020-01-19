import { HTMLFormatConfiguration } from 'vscode-html-languageservice';

export class Configuration {
    public hideAutoCompleteProposals = true;
    public suggestHtml5 = true;
    public htmlFormat: HTMLFormatConfiguration = {
        contentUnformatted: 'pre,code,textarea',
        endWithNewline: false,
        extraLiners: 'head, body, /html',
        indentHandlebars: false,
        indentInnerHtml: false,
        insertSpaces: true,
        maxPreserveNewLines: undefined,
        preserveNewLines: true,
        tabSize: 4,
        unformatted: 'wbr',
        wrapAttributes: 'auto',
        wrapAttributesIndentSize: undefined,
        wrapLineLength: 120,
    };

    public update(config: any): void {
        ///
    }
}
