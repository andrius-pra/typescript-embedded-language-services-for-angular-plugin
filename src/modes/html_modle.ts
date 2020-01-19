import * as vscode from 'vscode-languageserver-types';
import { Configuration } from '../configuration';
import { LanguageService as HTMLLanguageService } from 'vscode-html-languageservice';
import { getEmmetCompletionParticipants } from 'vscode-emmet-helper';
import { TemplateContext } from '../typescript-template-language-service-decorator';
import * as ts from 'typescript/lib/tsserverlibrary';
import { HtmlCachedCompletionList } from '../completions_cache';
import { BaseMode } from './base_mode';

export class HtmlMode extends BaseMode {
    constructor(
        protected readonly htmlLanguageService: HTMLLanguageService,
        typescript: typeof ts,
    ) {
        super(typescript);
    }

    public getCompletionsAtPosition(
        document: vscode.TextDocument,
        context: TemplateContext,
        position: ts.LineAndCharacter,
        configuration: Configuration,
    ): ts.CompletionInfo {
        const entry = this.getCompletionItems(document, context, position, configuration);
        return this.translateCompletionItemsToCompletionInfo(this.typescript, context, entry.value);
    }

    public getCompletionEntryDetails(
        document: vscode.TextDocument,
        context: TemplateContext,
        position: ts.LineAndCharacter,
        configuration: Configuration,
        name: string,
    ): ts.CompletionEntryDetails {
        const entry = this.getCompletionItems(document, context, position, configuration);

        const item = entry.value.items.find(x => x.label === name);
        if (!item) {
            return {
                name,
                kind: this.typescript.ScriptElementKind.unknown,
                kindModifiers: '',
                tags: [],
                displayParts: this.toDisplayParts(name),
                documentation: [],
            };
        }
        return this.translateCompletionItemsToCompletionEntryDetails(this.typescript, item);
    }

    public getQuickInfoAtPosition(
        document: vscode.TextDocument,
        context: TemplateContext,
        position: ts.LineAndCharacter,
    ) {
        const htmlDoc = this.htmlLanguageService.parseHTMLDocument(document);
        const hover = this.htmlLanguageService.doHover(document, position, htmlDoc);
        return hover ? this.translateHover(hover, position, context) : undefined;
    }

    public getOutliningSpans(
        document: vscode.TextDocument,
        context: TemplateContext,
    ): ts.OutliningSpan[] {
        const ranges = this.htmlLanguageService.getFoldingRanges(document);
        return ranges.map(range => this.translateOutliningSpan(context, range));
    }

    private getCompletionItems(
        document: vscode.TextDocument,
        context: TemplateContext,
        position: ts.LineAndCharacter,
        configuration: Configuration,
    ): HtmlCachedCompletionList {
        const cached = this._completionsCache.getCached(context, position);
        if (cached) {
            return cached;
        }
        const options = {
            hideAutoCompleteProposals: configuration.hideAutoCompleteProposals,
            html5: configuration.suggestHtml5,
        };
        const emmetResults: vscode.CompletionList = { isIncomplete: true, items: [] };
        const participants = [getEmmetCompletionParticipants(document, position, 'html', {}, emmetResults)];
        this.htmlLanguageService.setCompletionParticipants(participants);

        const htmlDocument = this.htmlLanguageService.parseHTMLDocument(document);
        const completionList = this.htmlLanguageService.doComplete(document, position, htmlDocument, options);

        if (emmetResults.items.length) {
            emmetResults.isIncomplete = true;
            completionList.items.push(...emmetResults.items);
        }
        const htmlCompletions: HtmlCachedCompletionList = {
            type: 'html',
            value: completionList,
        };
        return htmlCompletions;
    }
}
