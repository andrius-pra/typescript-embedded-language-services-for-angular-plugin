import * as vscode from 'vscode-languageserver-types';
import { Configuration } from '../configuration';
import { LanguageService as CssLanguageService } from 'vscode-css-languageservice';
import { getEmmetCompletionParticipants } from 'vscode-emmet-helper';
import { TemplateContext } from 'typescript-template-language-service-decorator';
import * as ts from 'typescript/lib/tsserverlibrary';
import { HtmlCachedCompletionList } from '../completions_cache';
import { BaseMode } from './base_mode';

export class CssMode extends BaseMode {
    constructor(
        protected cssLanguageService: CssLanguageService,
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
        const stylesheet = this.cssLanguageService.parseStylesheet(document);
        const hover = this.cssLanguageService.doHover(document, position, stylesheet);
        return hover ? this.translateHover(hover, position, context) : undefined;
    }

    public getOutliningSpans(
        document: vscode.TextDocument,
        context: TemplateContext,
    ): ts.OutliningSpan[] {
        const ranges = this.cssLanguageService.getFoldingRanges(document);
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

        const emmetResults: vscode.CompletionList = { isIncomplete: true, items: [] };
        const participants = [getEmmetCompletionParticipants(document, position, 'css', {}, emmetResults)];
        this.cssLanguageService.setCompletionParticipants(participants);
        const stylesheet = this.cssLanguageService.parseStylesheet(document);
        const completionList = this.cssLanguageService.doComplete(document, position, stylesheet);

        if (emmetResults.items.length) {
            emmetResults.isIncomplete = true;
            completionList.items.push(...emmetResults.items);
        }
        const htmlCompletions: HtmlCachedCompletionList = {
            type: 'css',
            value: completionList,
        };
        return htmlCompletions;
    }
}
