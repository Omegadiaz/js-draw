import templates from '../imageTemplates';
import { Localization } from '../localization';
import AbstractStore, { StoreEntry } from '../storage/AbstractStore';
import makeReadOnlyStoreEntry from '../storage/makeReadOnlyStoreEntry';
import './newImageDialog.css';

/**
 * Create a dialog that allows users to create a new drawing from the content
 * of a file or from a template.
 *
 * @returns a promise that resolves when the dialog is submitted or closed.
 */
const makeNewImageDialog = (
	localization: Localization,
	store: AbstractStore,
): Promise<StoreEntry | null> => {
	let dialogResult: StoreEntry | null | undefined = undefined;

	let closeDialogWithResult = (result: StoreEntry | null) => {
		dialogResult = result;
	};

	const closeDialogWithStringResult = async (result: string) => {
		const onInvalidOperation = () => {
			alert('Warning: Not saved.');
		};

		let item: StoreEntry | null = await store.createNewEntry();
		if (item === null) {
			alert(localization.warningSaveTargetOnlySupportsOneImage);

			item = makeReadOnlyStoreEntry(result, onInvalidOperation);
		} else {
			// Set the initial content of the item.
			await item.write(result);
		}

		closeDialogWithResult(item);
	};

	const background = document.createElement('dialog');
	background.classList.add('dialog-background');
	background.classList.add('new-image-dialog-background');

	const container = document.createElement('div');
	container.classList.add('dialog');
	container.classList.add('new-image-dialog');

	const titleElem = document.createElement('h2');
	titleElem.innerText = localization.newImageHeading;

	const makeCreationOption = (title: string) => {
		const fieldset = document.createElement('fieldset');
		const legend = document.createElement('legend');
		legend.appendChild(document.createTextNode(title));

		fieldset.appendChild(legend);
		return fieldset;
	};

	const fromFileArea = makeCreationOption('From file');
	const fromTemplateArea = makeCreationOption('From template');
	const fromTextboxArea = makeCreationOption('From SVG text');

	fromTemplateArea.classList.add('from-template-container');

	// From file
	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.setAttribute('accept', 'image/svg,image/svg+xml,text/plain');
	fromFileArea.appendChild(fileInput);

	// From textbox
	const svgTextbox = document.createElement('textarea');
	svgTextbox.setAttribute('placeholder', localization.pasteSVGTextDataHint);
	const acceptSVGTextboxButton = document.createElement('button');
	acceptSVGTextboxButton.innerText = localization.submit;

	acceptSVGTextboxButton.onclick = () => {
		closeDialogWithStringResult(svgTextbox.value);
	};

	fromTextboxArea.replaceChildren(svgTextbox, acceptSVGTextboxButton);

	// Danger: svgData is not sanitized!
	const addTemplateOption = (title: string, svgData: string) => {
		const templateButton = document.createElement('button');
		templateButton.classList.add('new-image-template-button');

		const icon = new Image();
		icon.classList.add('icon');
		icon.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`;
		const label = document.createElement('div');
		label.textContent = title;

		templateButton.onclick = () => {
			closeDialogWithStringResult(svgData);
		};

		templateButton.replaceChildren(icon, label);
		fromTemplateArea.appendChild(templateButton);
	};

	for (const template of Object.values(templates)) {
		addTemplateOption(template.name(localization), template.data());
	}

	const advancedArea = document.createElement('details');
	const advancedAreaSummary = document.createElement('summary');
	advancedAreaSummary.innerText = localization.advancedOptions;
	advancedArea.replaceChildren(advancedAreaSummary, fromTextboxArea);

	container.replaceChildren(titleElem, fromTemplateArea, fromFileArea, advancedArea);
	background.appendChild(container);
	document.body.appendChild(background);
	background.show();

	// Handle file uploads.
	fileInput.onchange = () => {
		const files = fileInput.files ?? [];

		if (files.length > 1) {
			alert('Too many files!');
			return;
		}
		if (files.length === 0) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (progress) => {
			if (progress.target?.result) {
				// The reader was started with .readAsText, so we know [result]
				// is a string.
				closeDialogWithStringResult(progress.target.result as string);
			}
		};
		reader.readAsText(files[0]);
	};

	// Close the dialog when the user clicks on its background.
	background.onclick = (event) => {
		if (event.target === background) {
			closeDialogWithResult(null);
		}
	};

	// Return a Promise that resolves when the dialog is closed.
	return new Promise<StoreEntry | null>((resolve, _reject) => {
		if (dialogResult !== undefined) {
			background.remove();
			resolve(dialogResult);
		}

		closeDialogWithResult = (result: StoreEntry | null) => {
			background.remove();
			resolve(result);
		};
	});
};

export default makeNewImageDialog;
