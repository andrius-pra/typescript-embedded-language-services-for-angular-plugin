import * as vscode from 'vscode-languageserver-types';
import { Configuration } from '../configuration';
import { TemplateContext } from '../typescript-template-language-service-decorator';
import * as ts from 'typescript/lib/tsserverlibrary';
import { CompletionsCache } from '../completions_cache';
import { FoldingRange } from 'vscode-languageserver-types';

export abstract class BaseMode {
    protected _completionsCache = new CompletionsCache();

    constructor(
        protected readonly typescript: typeof ts,
    ) { }

    public abstract getCompletionsAtPosition(
        document: vscode.TextDocument,
        context: TemplateContext,
        position: ts.LineAndCharacter,
        configuration: Configuration): ts.CompletionInfo;

    public abstract getCompletionEntryDetails(
        document: vscode.TextDocument,
        context: TemplateContext,
        position: ts.LineAndCharacter,
        configuration: Configuration,
        name: string,
    ): ts.CompletionEntryDetails;

    public abstract getQuickInfoAtPosition(
        document: vscode.TextDocument,
        context: TemplateContext,
        position: ts.LineAndCharacter,
    ): ts.QuickInfo | undefined;

    public abstract getOutliningSpans(
        document: vscode.TextDocument,
        context: TemplateContext,
    ): ts.OutliningSpan[];

    protected translateHover(
        hover: vscode.Hover,
        position: ts.LineAndCharacter,
        context: TemplateContext,
    ): ts.QuickInfo {
        const header: ts.SymbolDisplayPart[] = [];
        const docs: ts.SymbolDisplayPart[] = [];
        const convertPart = (hoverContents: typeof hover.contents) => {
            if (typeof hoverContents === 'string') {
                docs.push({ kind: 'unknown', text: hoverContents });
            } else if (Array.isArray(hoverContents)) {
                hoverContents.forEach(convertPart);
            } else {
                header.push({ kind: 'unknown', text: hoverContents.value });
            }
        };
        convertPart(hover.contents);
        const start = context.toOffset(hover.range ? hover.range.start : position);
        return {
            kind: this.typescript.ScriptElementKind.string,
            kindModifiers: '',
            textSpan: {
                start,
                length: hover.range ? context.toOffset(hover.range.end) - start : 1,
            },
            displayParts: header,
            documentation: docs,
            tags: [],
        };
    }

    protected translateCompletionItemsToCompletionEntryDetails(
        typescript: typeof ts,
        item: vscode.CompletionItem,
    ): ts.CompletionEntryDetails {
        return {
            name: item.label,
            kindModifiers: 'declare',
            kind: item.kind ?
                this.translateionCompletionItemKind(typescript, item.kind) :
                typescript.ScriptElementKind.unknown,
            displayParts: this.toDisplayParts(item.detail),
            documentation: this.toDisplayParts(item.documentation),
            tags: [],
        };
    }

    protected toDisplayParts(
        text: string | vscode.MarkupContent | undefined,
    ): ts.SymbolDisplayPart[] {
        if (!text) {
            return [];
        }
        return [{
            kind: 'text',
            text: typeof text === 'string' ? text : text.value,
        }];
    }

    protected translateOutliningSpan(
        context: TemplateContext,
        range: FoldingRange,
    ): ts.OutliningSpan {
        const startOffset = context.toOffset({ line: range.startLine, character: range.startCharacter || 0 });
        const endOffset = context.toOffset({ line: range.endLine, character: range.endCharacter || 0 });
        const span = {
            start: startOffset,
            length: endOffset - startOffset,
        };

        return {
            autoCollapse: false,
            kind: this.typescript.OutliningSpanKind.Code,
            bannerText: '',
            textSpan: span,
            hintSpan: span,
        };
    }

    protected translateCompletionItemsToCompletionInfo(
        typescript: typeof ts,
        context: TemplateContext,
        items: vscode.CompletionList,
    ): ts.CompletionInfo {
        return {
            isGlobalCompletion: false,
            isMemberCompletion: false,
            isNewIdentifierLocation: false,
            entries: items.items.map(x => this.translateCompetionEntry(typescript, context, x)),
        };
    }

    protected translateCompetionEntry(
        typescript: typeof ts,
        context: TemplateContext,
        vsItem: vscode.CompletionItem,
    ): ts.CompletionEntry {
        const kind = vsItem.kind ?
            this.translateionCompletionItemKind(typescript, vsItem.kind) :
            typescript.ScriptElementKind.unknown;
        const entry: ts.CompletionEntry = {
            name: vsItem.label,
            kind,
            sortText: vsItem.sortText ?? vsItem.label,
        };

        if (vsItem.textEdit) {
            entry.insertText = vsItem.textEdit.newText;
            entry.replacementSpan = this.toTsSpan(context, vsItem.textEdit.range);
        }

        return entry;
    }

    protected translateionCompletionItemKind(
        typescript: typeof ts,
        kind: vscode.CompletionItemKind,
    ): ts.ScriptElementKind {
        switch (kind) {
            case vscode.CompletionItemKind.Method:
                return typescript.ScriptElementKind.memberFunctionElement;
            case vscode.CompletionItemKind.Function:
                return typescript.ScriptElementKind.functionElement;
            case vscode.CompletionItemKind.Constructor:
                return typescript.ScriptElementKind.constructorImplementationElement;
            case vscode.CompletionItemKind.Field:
            case vscode.CompletionItemKind.Variable:
                return typescript.ScriptElementKind.variableElement;
            case vscode.CompletionItemKind.Class:
                return typescript.ScriptElementKind.classElement;
            case vscode.CompletionItemKind.Interface:
                return typescript.ScriptElementKind.interfaceElement;
            case vscode.CompletionItemKind.Module:
                return typescript.ScriptElementKind.moduleElement;
            case vscode.CompletionItemKind.Property:
                return typescript.ScriptElementKind.memberVariableElement;
            case vscode.CompletionItemKind.Unit:
            case vscode.CompletionItemKind.Value:
                return typescript.ScriptElementKind.constElement;
            case vscode.CompletionItemKind.Enum:
                return typescript.ScriptElementKind.enumElement;
            case vscode.CompletionItemKind.Keyword:
                return typescript.ScriptElementKind.keyword;
            case vscode.CompletionItemKind.Color:
                return typescript.ScriptElementKind.constElement;
            case vscode.CompletionItemKind.Reference:
                return typescript.ScriptElementKind.alias;
            case vscode.CompletionItemKind.File:
                return typescript.ScriptElementKind.moduleElement;
            case vscode.CompletionItemKind.Snippet:
            case vscode.CompletionItemKind.Text:
            default:
                return typescript.ScriptElementKind.unknown;
        }
    }

    protected toTsSpan(
        context: TemplateContext,
        range: vscode.Range,
    ): ts.TextSpan {
        const editStart = context.toOffset(range.start);
        const editEnd = context.toOffset(range.end);

        return {
            start: editStart,
            length: editEnd - editStart,
        };
    }
}
