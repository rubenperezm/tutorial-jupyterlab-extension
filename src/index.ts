import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { 
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
} from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

interface APODResponse {
  copyright: string;
  date: string;
  explanation: string;
  media_type: 'video' | 'image';
  title: string;
  url: string;
};

class APODWidget extends Widget {
  /**
  * Construct a new APOD widget.
  */
  constructor() {
    super();

    this.addClass('my-apodWidget');

    // Add an anchor element to the panel
    this.a = document.createElement('a');
    this.a.target = '_blank';
    this.node.appendChild(this.a);

    // Add an image element as a child of the anchor element
    this.img = document.createElement('img');
    this.a.appendChild(this.img);

    // Add a summary element to the panel
    this.summary = document.createElement('p');
    this.node.appendChild(this.summary);
  }

  /**
   * The anchor element associated with the widget.
   */
  readonly a: HTMLAnchorElement;
  /**
  * The image element associated with the widget.
  */
  readonly img: HTMLImageElement;

  /**
  * The summary text element associated with the widget.
  */
  readonly summary: HTMLParagraphElement;

  /**
  * Handle update requests for the widget.
  */
  async updateAPODImage(): Promise<void> {
    const date = this.randomDate();
    const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${date}`);

    if (!response.ok) {
      const data = await response.json();
      if (data.error) {
        this.summary.innerText = data.error.message;
      } else {
        this.summary.innerText = response.statusText;
      }
      return;
    }

    const data = await response.json() as APODResponse;

    if (data.media_type === 'image') {
      // Link the URL to the APOD's page
      this.a.href = `https://apod.nasa.gov/apod/ap${date.replace(/-/g, '').substring(2)}.html`;
      // Populate the image
      this.img.src = data.url;
      this.img.title = data.title;
      this.img.onload = () => {
        this.summary.innerText = data.title + '\n' + data.explanation;
        if (data.copyright) {
          this.summary.innerText += ` (Copyright ${data.copyright.trim()})`;
        }
      }
    } else {
      // Clean image
      this.img.remove();
      this.summary.innerText = 'Random APOD fetched was not an image.';
    }
  }

  /**
  * Get a random date string in YYYY-MM-DD format.
  */
  randomDate(): string {
    const start = new Date(2010, 1, 1);
    const end = new Date();
    const randomDate = new Date(start.getTime() + Math.random()*(end.getTime() - start.getTime()));
    return randomDate.toISOString().slice(0, 10);
  }
}

/**
* Activate the APOD widget extension.
*/
function activate(app: JupyterFrontEnd, palette: ICommandPalette, restorer: ILayoutRestorer | null) {
  console.log('JupyterLab extension jupyterlab_apod is activated!');

  // Declare a widget variable
  let widget: MainAreaWidget<APODWidget>;

  // Add an application command
  const command: string = 'apod:open';
  app.commands.addCommand(command, {
    label: 'Random Astronomy Picture',
    execute: () => {
      if (!widget || widget.isDisposed) {
        const content = new APODWidget();
        widget = new MainAreaWidget({content});
        widget.id = 'apod-jupyterlab';
        widget.title.label = 'Astronomy Picture';
        widget.title.closable = true;
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, 'main');
      }
      widget.content.updateAPODImage();

      // Activate the widget
      app.shell.activateById(widget.id);
    }
  });

  // Add shortcut to the command
  app.commands.addKeyBinding({
    command: command,
    args: {},
    keys: ['Accel Alt P'],
    selector: 'body'
  });

  // Add the command to the palette.
  palette.addItem({ command, category: 'Tutorial' });

  // Track and restore the widget state
  let tracker = new WidgetTracker<MainAreaWidget<APODWidget>>({
    namespace: 'apod'
  });
  if (restorer) {
    restorer.restore(tracker, {
      command,
      name: () => 'apod'
    });
  }
}

/**
 * Initialization data for the jupyterlab_apod extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_apod',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ILayoutRestorer],
  activate: activate
};

export default plugin;
