import { LightningElement, api, track, wire } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference} from 'lightning/navigation';
import pubsub from 'c/cssPubSub';
import fileNameLabel from '@salesforce/label/c.css_IndividualPictureFileName';

const EVT_CLOSE = 'closeaction';
const EVT_PICTURE_CHANGE = 'picturechange';
const ERROR_MSG = 'Unknown error: ';

export default class IspUploadContactPicture extends LightningElement {

    @api recordId;
    @track fileId;
    @wire(CurrentPageReference) pageRef;
    fileNameLabel = fileNameLabel;
    latestVersionId;
    hasExistingContactPicture;

    get acceptedFormats() {
        return ['.jpg', '.jpeg', '.png', '.gif'];
    }

    get contactId() {
        let result;
        if (!this.fileId) {
            // only set the contact id if an existing image doesn't exist
            result = this.recordId;
        }
        return result;
    }

    handleFileIdRetrieved({ detail }) {
        this.fileId = detail.fileId;
        this.latestVersionId = detail.latestVersionId;
        this.hasExistingContactPicture = true;
    }

    async handleUploadFinished(evt) {
        const uploadedFiles = evt.detail.files;
        const newVersionId = (uploadedFiles[0] || {}).contentVersionId;
        const showPictureEl = this.template.querySelector('c-css-show-image');
        this.fileId = (uploadedFiles[0] || {}).documentId;
        this.latestVersionId = newVersionId;
        await this.updateContentVersion(newVersionId, true);
        this.publishFinishEvent();
        this.dispatchEvent(new CustomEvent(EVT_CLOSE));
        if (showPictureEl) {
            showPictureEl.refresh();
        }
    }

    async updateContentVersion(contentVersionId) {
        try {
            const recordInput = {
                fields: {
                    Id: contentVersionId, 
                    Title: fileNameLabel
                }
            };
            await updateRecord(recordInput);
        } catch (err) {
            let errorMsg = ((err || {}).body || {}).message;
            if (!errorMsg) {
                errorMsg = (ERROR_MSG + JSON.stringify(err || {}));
            }
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating file.',
                    message: errorMsg,
                    variant: 'error',
                }),
            );
        }
    }

    publishFinishEvent() {
        const payload = {
            recordId: this.recordId,
            fileId: this.fileId
        };
        pubsub.fireEvent(this.pageRef, EVT_PICTURE_CHANGE, payload);
    }
}