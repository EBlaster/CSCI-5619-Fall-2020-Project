/* CSCI 5619 Assignment 6, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Space, Color4, Plane } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRControllerComponent } from
  "@babylonjs/core/XR/motionController/webXRControllercomponent";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";
import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Logger } from "@babylonjs/core/Misc/logger";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { Mesh } from "@babylonjs/core/Meshes/Mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { Quaternion, Vector2 } from "@babylonjs/core/Maths/math.vector";
import { AdvancedTimer, AssetsManager } from "@babylonjs/core/Misc";
import { Animation } from "@babylonjs/core/Animations/animation";
import { HighlightLayer } from "@babylonjs/core";
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager";
import { Control } from "@babylonjs/gui/2D/controls";
import { Button3D } from "@babylonjs/gui/3D/controls/button3D";
import { ColorPicker } from "@babylonjs/gui/2D/controls/colorpicker";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Checkbox } from "@babylonjs/gui/2D/controls/checkbox";
import { Slider } from "@babylonjs/gui/2D/controls/sliders/slider";
import { RadioButton } from "@babylonjs/gui/2D/controls/radioButton";
import { VirtualKeyboard } from "@babylonjs/gui/2D/controls/virtualKeyboard";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { InputText } from "@babylonjs/gui/2D/controls/inputText";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"


// Side effects
import "@babylonjs/loaders/glTF/2.0/glTFLoader"
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import { prePassDeclaration } from "@babylonjs/core/Shaders/ShadersInclude/prePassDeclaration";

enum LocomotionMode {
  viewDirected,
  handDirected,
  teleportation,
  visualizedTele
}

class Game {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;

  private xrCamera: WebXRCamera | null;
  private xrSessionManager: WebXRSessionManager | null;
  private leftController: WebXRInputSource | null;
  private rightController: WebXRInputSource | null;

  private locomotionMode: LocomotionMode;
  private flyMode: boolean;
  private turned: boolean;
  private holding: Mesh | null;

  private groundMeshes: Array<AbstractMesh>;
  private teleportPoint: Vector3 | null;
  private teleportBox: Mesh | null;
  private workspaceBox: Mesh | null;
  private workspaceUser: Mesh | null;

  private movement: Animation | null;
  private frameCount: number;
  private keyFrames: any[];

  private highlight: HighlightLayer;
  private picker: ColorPicker | null;
  private pickerPlane: Mesh | null;
  private selectedMesh: Mesh | null;
  private selectedInstancedMesh: InstancedMesh | null;
  private selectedMaterial: StandardMaterial | null;
  private controllerGuiTransform: TransformNode | null;

  private sampleBox: Mesh | null;
  private sampleSphere: Mesh | null;
  private sampleCylinder: Mesh | null;
  private savedMesh: Mesh[] | null;

  private meshPlane: Mesh | null;
  private configPlane: Mesh | null;
  private boardPlane: Mesh | null;
  private notepadPlane: Mesh | null;

  private meshPlaneTransform: TransformNode | null;
  private configPlaneTransform: TransformNode | null;
  private boardPlaneTransform: TransformNode | null;
  private notepadPlaneTransform: TransformNode | null;

  private openedNotepadPlane: boolean;
  private openedMeshPlane: boolean;
  private openedConfigPlane: boolean;
  private openedBoardPlane: boolean;

  private configurableMesh: Mesh | null;
  private moveSpeed: number;

  // Anlan 12122020
  private world: Mesh | null;
  private worldOriginalPosition: Vector3;
  private cameraOriginalPosition: Vector3;
  private mapMode: boolean;
  private originalLocomotionMode: LocomotionMode;
  private originalFlyMode: boolean;

  constructor() {
    // Get the canvas element
    this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    // Generate the BABYLON 3D engine
    this.engine = new Engine(this.canvas, true);

    // Creates a basic Babylon Scene object
    this.scene = new Scene(this.engine);

    this.xrCamera = null;
    this.xrSessionManager = null;
    this.leftController = null;
    this.rightController = null;

    this.locomotionMode = LocomotionMode.viewDirected;
    this.flyMode = false;
    this.turned = false;
    this.holding = null;

    this.groundMeshes = [];
    this.teleportPoint = null;
    this.teleportBox = null;
    this.workspaceBox = null;
    this.workspaceUser = null;

    this.movement = null;
    this.frameCount = 0;
    this.keyFrames = [];

    this.highlight = new HighlightLayer("highlight", this.scene);
    this.picker = null;
    this.pickerPlane = null;
    this.selectedMesh = null;
    this.selectedInstancedMesh = null;
    this.selectedMaterial = null;
    this.controllerGuiTransform = null;

    this.sampleBox = null;
    this.sampleSphere = null;
    this.sampleCylinder = null;
    this.savedMesh = [];

    this.meshPlane = null;
    this.configPlane = null;
    this.boardPlane = null;
    this.notepadPlane = null;

    this.meshPlaneTransform = null;
    this.configPlaneTransform = null;
    this.boardPlaneTransform = null;
    this.notepadPlaneTransform = null;

    this.openedNotepadPlane = false;
    this.openedMeshPlane = false;
    this.openedConfigPlane = false;
    this.openedBoardPlane = false;

    this.configurableMesh = null;
    this.moveSpeed = 3;

    // Anlan 12122020
    this.world = null;
    this.worldOriginalPosition = new Vector3(0, .01, 0);
    this.cameraOriginalPosition = new Vector3(0, 1.6, 0);
    this.mapMode = false;
    this.originalLocomotionMode = this.locomotionMode;
    this.originalFlyMode = this.flyMode;
  }

  start(): void {
    // Create the scene and then execute this function afterwards
    this.createScene().then(() => {

      // Register a render loop to repeatedly render the scene
      this.engine.runRenderLoop(() => {
        this.update();
        this.scene.render();
      });

      // Watch for browser/canvas resize events
      window.addEventListener("resize", () => {
        this.engine.resize();
      });
    });
  }

  private async createScene() {
    // This creates and positions a first-person camera (non-mesh)
    var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
    camera.fov = 90 * Math.PI / 180;
    camera.minZ = .1;
    camera.maxZ = 1000;

    // This attaches the camera to the canvas
    camera.attachControl(this.canvas, true);

    // Create a directional light
    var directionalLight = new DirectionalLight("directionalLight",
      new Vector3(-60, -120, 100), this.scene);
    directionalLight.intensity = 8;
    directionalLight.diffuse = new Color3(.25, .25, .25);

    var hemisphericLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
    hemisphericLight.intensity = 1;

    // Creates a default skybox
    const environment = this.scene.createDefaultEnvironment({
      createGround: true,
      groundSize: 500,
      skyboxSize: 600
    });

    // Creates a skybox
    var skyboxDayMaterial = new StandardMaterial("skyboxDay", this.scene);
    skyboxDayMaterial.backFaceCulling = false;
    skyboxDayMaterial.reflectionTexture = new CubeTexture("assets/textures/skybox", this.scene);
    skyboxDayMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxDayMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxDayMaterial.specularColor = new Color3(0, 0, 0);

    var skyboxNightMaterial = new StandardMaterial("skyboxNight", this.scene);
    skyboxNightMaterial.backFaceCulling = false;
    skyboxNightMaterial.reflectionTexture = new CubeTexture("assets/textures/skybox2", this.scene);
    skyboxNightMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxNightMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxNightMaterial.specularColor = new Color3(0, 0, 0);

    environment!.skybox!.material = skyboxDayMaterial;

    var groundMaterial = new StandardMaterial("ground", this.scene);
    groundMaterial.diffuseColor = new Color3(0, 0, 0);
    groundMaterial.specularColor = new Color3(0, 0, 0);
    groundMaterial.emissiveColor = new Color3(.39, .5, .3);
    environment!.ground!.material = groundMaterial;

    // Make sure the skybox is not pickable!
    environment!.skybox!.isPickable = false;

    // Creates the XR experience helper
    const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

    // Register event handler for selection events (pulling the trigger, clicking the mouse button)
    this.scene.onPointerObservable.add((pointerInfo) => {
      this.processPointer(pointerInfo);
    });

    // Assigns the web XR camera and session manager to member variables
    this.xrCamera = xrHelper.baseExperience.camera;
    this.xrCamera.position = new Vector3(-7, this.xrCamera!.realWorldHeight, 0);
    this.xrSessionManager = xrHelper.baseExperience.sessionManager;

    // Remove default teleportation and pointer selection
    xrHelper.teleportation.dispose();

    // Create points for the laser pointer
    var laserPoints = [];
    laserPoints.push(new Vector3(0, 0, 0));
    laserPoints.push(new Vector3(0, 0, 1));

    const earcut = require('earcut');
    (window as any).earcut = earcut;
    this.teleportBox = MeshBuilder.ExtrudePolygon("teleportBox",
      {
        shape: [new Vector3(-.4, .2, 0), new Vector3(0, .2, -.4),
        new Vector3(.4, .2, 0), new Vector3(0, .2, .8)], depth: .2
      }, this.scene);
    this.teleportBox.visibility = 0;
    this.teleportBox.isPickable = false;
    var teleportBoxMaterial = new StandardMaterial("teleportBox", this.scene);
    teleportBoxMaterial.alpha = .3;
    teleportBoxMaterial.emissiveColor = new Color3(0, 1, 0);
    this.teleportBox.material = teleportBoxMaterial;

    this.workspaceUser = MeshBuilder.ExtrudePolygon("workspaceUser",
      {
        shape: [new Vector3(-.4, .2, 0), new Vector3(0, .2, -.4),
        new Vector3(.4, .2, 0), new Vector3(0, .2, .8)], depth: .2
      }, this.scene);
    this.workspaceUser.visibility = 0;
    this.workspaceUser.isPickable = false;
    var workspaceUserMaterial = new StandardMaterial("workspaceUser", this.scene);
    workspaceUserMaterial.alpha = .7;
    workspaceUserMaterial.emissiveColor = new Color3(1, .5, 0);
    this.workspaceUser.material = workspaceUserMaterial;

    this.workspaceBox = MeshBuilder.CreateBox("workspace", { size: 3 }, this.scene);
    this.workspaceBox.visibility = 0;
    this.workspaceBox.isPickable = false;
    var workspaceBoxMaterial = new StandardMaterial("workspace", this.scene);
    workspaceBoxMaterial.alpha = .2;
    workspaceBoxMaterial.emissiveColor = new Color3(0, 1, 0);
    this.workspaceBox.material = workspaceBoxMaterial;

    var assetsManager = new AssetsManager(this.scene);

    // Create a task for each asset you want to load
    var worldTask = assetsManager.addMeshTask("world task", "", "assets/models/", "town.glb");
    worldTask.onSuccess = (task) => {
      worldTask.loadedMeshes[0].name = "world";
      worldTask.loadedMeshes[0].rotation = new Vector3(0, 0, 0);
      worldTask.loadedMeshes[0].position = new Vector3(0, .01, 0);
    }

    // This loads all the assets and displays a loading screen
    assetsManager.load();

    // This will execute when all assets are loaded
    assetsManager.onFinish = (tasks) => {
      // Add the floor meshes to the teleporter
      worldTask.loadedMeshes.forEach((mesh) => {
        if (mesh.name.includes("road") ||
          mesh.name.includes("grass") ||
          mesh.name.includes("sidewalk") ||
          mesh.name.includes("street")) {
          this.groundMeshes.push(mesh);
          xrHelper.teleportation.addFloorMesh(mesh);
        }
        // Anlan 12122020
        if(mesh.name == "world"){
          this.world = <Mesh>mesh;
          environment!.ground!.setParent(this.world);
        }
      });

      // Show the debug layer
      this.scene.debugLayer.show();
    };

    // The manager automates some of the GUI creation steps
    var guiManager = new GUI3DManager(this.scene);

    this.controllerGuiTransform = new TransformNode("controllerGuiTransform", this.scene);
    this.controllerGuiTransform.position = new Vector3(-.1, -.1, -.2);
    this.controllerGuiTransform.rotation = new Vector3(Math.PI * .3, Math.PI * .5, 0);

    // Create a night mode button
    var nightModeButton = new Button3D("nightModeButton");
    guiManager.addControl(nightModeButton);
    nightModeButton.scaling = new Vector3(.1, .05, .1);

    var nightModeButtonTransform = new TransformNode("nightModeButtonTransform", this.scene);
    nightModeButtonTransform.position = new Vector3(0, .06, .005);
    nightModeButtonTransform.rotation = new Vector3(10 * Math.PI / 180, 0, 0);
    nightModeButtonTransform.parent = this.controllerGuiTransform;
    nightModeButton.linkToTransformNode(nightModeButtonTransform);

    // Create the night mode button text
    var nightModeButtonText = new TextBlock();
    nightModeButtonText.text = "Night Mode";
    nightModeButtonText.color = "white";
    nightModeButtonText.fontSize = 12;
    nightModeButtonText.scaleX = 2;
    nightModeButtonText.scaleY = 4;
    nightModeButtonText.rotation = Math.PI;
    nightModeButton.content = nightModeButtonText;

    // Type cast the button material so we can change the color
    var buttonMaterial = <StandardMaterial>nightModeButton.mesh!.material;

    var backgroundColorDay = new Color3(1, 1, 200 / 255);
    var backgroundColorNight = new Color3(120 / 255, 100 / 255, 120 / 255);
    var hoverColorDay = new Color3(200 / 255, 200 / 255, 160 / 255);
    var hoverColorNight = new Color3(170 / 255, 150 / 255, 170 / 255);
    // Custom background color
    buttonMaterial.diffuseColor = backgroundColorDay;
    nightModeButton.pointerOutAnimation = () => {
      if (nightModeButtonText.text == "Night Mode") {
        buttonMaterial.diffuseColor = backgroundColorDay;
      } else {
        buttonMaterial.diffuseColor = backgroundColorNight;
      }
    }
    // Custom hover color
    nightModeButton.pointerEnterAnimation = () => {
      if (nightModeButtonText.text == "Night Mode") {
        buttonMaterial.diffuseColor = hoverColorDay;
      } else {
        buttonMaterial.diffuseColor = hoverColorNight;
      }
    }
    // Change the mode when button is pressed
    nightModeButton.onPointerDownObservable.add(() => {
      if (nightModeButtonText.text == "Night Mode") {
        buttonMaterial.diffuseColor = hoverColorNight;
        environment!.skybox!.material = skyboxNightMaterial;
        hemisphericLight.intensity = 0;
        directionalLight.intensity = 0;
        nightModeButtonText.text = "Day Mode"
      } else {
        buttonMaterial.diffuseColor = hoverColorDay;
        environment!.skybox!.material = skyboxDayMaterial;
        hemisphericLight.intensity = 1;
        directionalLight.intensity = 8;
        nightModeButtonText.text = "Night Mode"
      }
    });

    // Create a map mode button3D
    var mapModeButton = new Button3D("mapModeButton");
    guiManager.addControl(mapModeButton);
    mapModeButton.scaling = new Vector3(.1, .05, .1);

    var mapModeButtonTransform = new TransformNode("mapModeButtonTransform", this.scene);
    mapModeButtonTransform.parent = this.controllerGuiTransform;
    mapModeButton.linkToTransformNode(mapModeButtonTransform);

    var mapModeButtonText = new TextBlock();
    mapModeButtonText.text = "Map Mode";
    mapModeButtonText.color = "white";
    mapModeButtonText.fontSize = 12;
    mapModeButtonText.scaleX = 2;
    mapModeButtonText.scaleY = 4;
    mapModeButtonText.rotation = Math.PI;
    mapModeButton.content = mapModeButtonText;

    // Create a notepad button
    var notepadButton = new Button3D("notepadButton");
    guiManager.addControl(notepadButton);
    notepadButton.scaling = new Vector3(.1, .05, .1);

    var notepadButtonTransform = new TransformNode("notepadButtonTransform", this.scene);
    notepadButtonTransform.position = new Vector3(.12, 0, 0);
    notepadButtonTransform.parent = this.controllerGuiTransform;
    notepadButton.linkToTransformNode(notepadButtonTransform);

    var notepadButtonText = new TextBlock();
    notepadButtonText.text = "Notepad";
    notepadButtonText.color = "white";
    notepadButtonText.fontSize = 12;
    notepadButtonText.scaleX = 2;
    notepadButtonText.scaleY = 4;
    notepadButtonText.rotation = Math.PI;
    notepadButton.content = notepadButtonText;

    this.notepadPlane = MeshBuilder.CreatePlane("notepadPlane",
      { width: 0.5, height: 0.3 }, this.scene);
    this.notepadPlaneTransform = new TransformNode("notepadPlaneTransform");
    this.notepadPlaneTransform.position = new Vector3(0, -.25, 0);
    this.notepadPlaneTransform.rotation = new Vector3(150 * Math.PI / 180, Math.PI, 0);
    this.notepadPlane.parent = this.notepadPlaneTransform;
    this.notepadPlaneTransform.parent = this.controllerGuiTransform;
    this.notepadPlane.isVisible = false;
    this.notepadPlane.isPickable = false;

    var notepadTexture = AdvancedDynamicTexture.CreateForMesh(this.notepadPlane, 500, 300);
    notepadTexture.background = (new Color4(.5, .5, .5, .75)).toHexString();

    var notepadPanel = new StackPanel("notepadPanel");
    notepadPanel.widthInPixels = 500;
    notepadPanel.heightInPixels = 300;
    notepadPanel.isVertical = true;
    notepadTexture.addControl(notepadPanel);

    var notepadMessagePanel = new StackPanel("notepadMessagePanel");
    notepadMessagePanel.widthInPixels = 500;
    notepadMessagePanel.heightInPixels = 270;
    notepadMessagePanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
    notepadPanel.addControl(notepadMessagePanel);

    var notepadInput = new InputText("notepadInput");
    notepadInput.width = "500px";
    notepadInput.height = "30px";
    notepadInput.maxWidth = "500px";
    notepadInput.color = "white";
    notepadInput.background = "transparent";
    notepadInput.thickness = 1;
    notepadInput.focusedBackground = "transparent";
    notepadInput.verticalAlignment = InputText.VERTICAL_ALIGNMENT_BOTTOM;
    notepadPanel.addControl(notepadInput);

    notepadButton.onPointerDownObservable.add(() => {
      if (this.openedNotepadPlane) {
        this.notepadPlane!.isVisible = false;
        this.notepadPlane!.isPickable = false;
        if (this.notepadPlane!.parent == this.xrCamera) {
          this.notepadPlane!.parent = this.notepadPlaneTransform;
          this.notepadPlane!.position = new Vector3(0, 0, 0);
          this.notepadPlane!.rotation = new Vector3(0, 0, 0);
        }
      } else {
        this.notepadPlane!.isVisible = true;
        this.notepadPlane!.isPickable = true;
        if (this.meshPlane!.parent != this.xrCamera) {
          this.meshPlane!.isVisible = false;
          this.meshPlane!.isPickable = false;
          this.sampleBox!.isVisible = false;
          this.sampleBox!.isPickable = false;
          this.sampleSphere!.isVisible = false;
          this.sampleSphere!.isPickable = false;
          this.sampleCylinder!.isVisible = false;
          this.sampleCylinder!.isPickable = false;
          this.openedMeshPlane = false;
        }
        if (this.configPlane!.parent != this.xrCamera) {
          this.configPlane!.isVisible = false;
          this.configPlane!.isPickable = false;
          this.openedConfigPlane = false;
        }
        if (this.boardPlane!.parent != this.xrCamera) {
          this.boardPlane!.isVisible = false;
          this.boardPlane!.isPickable = false;
          this.openedBoardPlane = false;
        }
      }
      this.openedNotepadPlane = !this.openedNotepadPlane;
    });

    var keyboard = VirtualKeyboard.CreateDefaultLayout("keyboard");
    keyboard.background = (new Color4(.5, .5, .5, .75)).toHexString();
    keyboard.verticalAlignment = VirtualKeyboard.VERTICAL_ALIGNMENT_BOTTOM;
    keyboard.paddingBottomInPixels = 30;
    notepadTexture.addControl(keyboard);
    keyboard.connect(notepadInput);

    keyboard.onKeyPressObservable.add((data) => {
      if (data == "\u21B5") {
        var container = new StackPanel();
        container.isVertical = true;
        container.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_BOTTOM;
        container.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
        notepadMessagePanel.addControl(container);

        var message = new TextBlock();
        message.text = notepadInput.text;
        message.color = 'white';
        message.width = '500px';
        message.height = '30px';
        message.fontSize = '20px';
        message.left = '10px';
        message.textWrapping = true;
        message.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_BOTTOM;
        message.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        container.addControl(message);
        notepadInput.text = '';
      }
    })

    // Create a drawing board button
    var boardButton = new Button3D("boardButton");
    guiManager.addControl(boardButton);
    boardButton.scaling = new Vector3(.1, .05, .1);

    var boardButtonTransform = new TransformNode("boardButtonTransform", this.scene);
    boardButtonTransform.position = new Vector3(.12, -.06, .005);
    boardButtonTransform.rotation = new Vector3(-10 * Math.PI / 180, 0, 0);
    boardButtonTransform.parent = this.controllerGuiTransform;
    boardButton.linkToTransformNode(boardButtonTransform);

    var boardButtonText = new TextBlock();
    boardButtonText.text = "Drawing Board";
    boardButtonText.color = "white";
    boardButtonText.fontSize = 12;
    boardButtonText.scaleX = 2;
    boardButtonText.scaleY = 4;
    boardButtonText.rotation = Math.PI;
    boardButton.content = boardButtonText;

    this.boardPlane = MeshBuilder.CreatePlane("boardPlane",
      { width: 0.5, height: 0.3 }, this.scene);
    this.boardPlaneTransform = new TransformNode("boardPlaneTransform");
    this.boardPlaneTransform.position = new Vector3(0, -.25, 0);
    this.boardPlaneTransform.rotation = new Vector3(150 * Math.PI / 180, Math.PI, 0);
    this.boardPlane.parent = this.boardPlaneTransform;
    this.boardPlaneTransform.parent = this.controllerGuiTransform;
    this.boardPlane.isVisible = false;
    this.boardPlane.isPickable = false;

    var boardTexture = AdvancedDynamicTexture.CreateForMesh(this.boardPlane, 500, 300);

    var boardPanel = new StackPanel("boardPanel");
    boardPanel.widthInPixels = 500;
    boardPanel.heightInPixels = 300;
    boardTexture.addControl(boardPanel);

    var dynamicTexture = new DynamicTexture(
      "dynamicTexture", { width: 500, height: 300 }, this.scene, false);
    var boardMaterial = new StandardMaterial("boardMaterial", this.scene);
    boardMaterial.diffuseTexture = dynamicTexture;
    boardMaterial.specularColor = new Color3(0, 0, 0);
    this.boardPlane.material = boardMaterial;
    var context = dynamicTexture.getContext();
    context.fillStyle = "white";
    context.strokeStyle = 'black';
    context.rect(0, 0, 500, 300);
    context.fill();
    context.lineWidth = 1;
    dynamicTexture.update();

    var draw = false;
    boardPanel.onPointerDownObservable.add((pos) => {
      context.beginPath();
      context.moveTo(pos.x, pos.y);
      draw = true;
    });
    boardPanel.onPointerUpObservable.add(() => {
      draw = false;
    })
    boardPanel.onPointerOutObservable.add(() => {
      draw = false;
    })
    boardPanel.onPointerMoveObservable.add((pos, state) => {
      if (draw) {
        context.lineTo(pos.x, pos.y);
        context.stroke();
        dynamicTexture.update();
      }
    });

    boardButton.onPointerDownObservable.add(() => {
      if (this.openedBoardPlane) {
        this.boardPlane!.isVisible = false;
        this.boardPlane!.isPickable = false;
        if (this.boardPlane!.parent == this.xrCamera) {
          this.boardPlane!.parent = this.boardPlaneTransform;
          this.boardPlane!.position = new Vector3(0, 0, 0);
          this.boardPlane!.rotation = new Vector3(0, 0, 0);
        }
      } else {
        this.boardPlane!.isVisible = true;
        this.boardPlane!.isPickable = true;
        if (this.meshPlane!.parent != this.xrCamera) {
          this.meshPlane!.isVisible = false;
          this.meshPlane!.isPickable = false;
          this.sampleBox!.isVisible = false;
          this.sampleBox!.isPickable = false;
          this.sampleSphere!.isVisible = false;
          this.sampleSphere!.isPickable = false;
          this.sampleCylinder!.isVisible = false;
          this.sampleCylinder!.isPickable = false;
          this.openedMeshPlane = false;
        }
        if (this.configPlane!.parent != this.xrCamera) {
          this.configPlane!.isVisible = false;
          this.configPlane!.isPickable = false;
          this.openedConfigPlane = false;
        }
        if (this.notepadPlane!.parent != this.xrCamera) {
          this.notepadPlane!.isVisible = false;
          this.notepadPlane!.isPickable = false;
          this.openedNotepadPlane = false;
        }
      }
      this.openedBoardPlane = !this.openedBoardPlane;
    });

    // Create a mesh builder button
    var meshButton = new Button3D("meshButton");
    guiManager.addControl(meshButton);
    meshButton.scaling = new Vector3(.1, .05, .1);

    var meshButtonTransform = new TransformNode("meshButtonTransform", this.scene);
    meshButtonTransform.position = new Vector3(.12, .06, .005);
    meshButtonTransform.rotation = new Vector3(10 * Math.PI / 180, 0, 0);
    meshButtonTransform.parent = this.controllerGuiTransform;
    meshButton.linkToTransformNode(meshButtonTransform);

    var meshButtonText = new TextBlock();
    meshButtonText.text = "Mesh Builder";
    meshButtonText.color = "white";
    meshButtonText.fontSize = 12;
    meshButtonText.scaleX = 2;
    meshButtonText.scaleY = 4;
    meshButtonText.rotation = Math.PI;
    meshButton.content = meshButtonText;

    meshButton.onPointerDownObservable.add(() => {
      if (this.openedMeshPlane) {
        this.meshPlane!.isVisible = false;
        this.meshPlane!.isPickable = false;
        this.sampleBox!.isVisible = false;
        this.sampleBox!.isPickable = false;
        this.sampleSphere!.isVisible = false;
        this.sampleSphere!.isPickable = false;
        this.sampleCylinder!.isVisible = false;
        this.sampleCylinder!.isPickable = false;
        if (this.meshPlane!.parent == this.xrCamera) {
          this.meshPlane!.parent = this.meshPlaneTransform;
          this.meshPlane!.position = new Vector3(0, 0, 0);
          this.meshPlane!.rotation = new Vector3(0, 0, 0);
        }
      } else {
        this.meshPlane!.isVisible = true;
        this.meshPlane!.isPickable = true;
        this.sampleBox!.isVisible = true;
        this.sampleBox!.isPickable = true;
        this.sampleSphere!.isVisible = true;
        this.sampleSphere!.isPickable = true;
        this.sampleCylinder!.isVisible = true;
        this.sampleCylinder!.isPickable = true;
        if (this.configPlane!.parent != this.xrCamera) {
          this.configPlane!.isVisible = false;
          this.configPlane!.isPickable = false;
          this.openedConfigPlane = false;
        }
        if (this.notepadPlane!.parent != this.xrCamera) {
          this.notepadPlane!.isVisible = false;
          this.notepadPlane!.isPickable = false;
          this.openedNotepadPlane = false;
        }
        if (this.boardPlane!.parent != this.xrCamera) {
          this.boardPlane!.isVisible = false;
          this.boardPlane!.isPickable = false;
          this.openedBoardPlane = false;
        }
      }
      this.openedMeshPlane = !this.openedMeshPlane;
    });

    this.meshPlane = MeshBuilder.CreatePlane("meshPlane",
    { width: 0.5, height: 0.3 }, this.scene);
    this.meshPlaneTransform = new TransformNode("meshPlaneTransform");
    this.meshPlaneTransform.position = new Vector3(0, -.25, 0);
    this.meshPlaneTransform.rotation = new Vector3(150 * Math.PI / 180, Math.PI, 0);
    this.meshPlane.parent = this.meshPlaneTransform;
    this.meshPlaneTransform.parent = this.controllerGuiTransform;
    this.meshPlane.isVisible = false;
    this.meshPlane.isPickable = false;

    var meshTexture = AdvancedDynamicTexture.CreateForMesh(this.meshPlane, 500, 300);
    meshTexture.background = (new Color4(.5, .5, .5, .75)).toHexString();

    this.sampleBox = MeshBuilder.CreateBox("this.sampleBox", { size: .09 }, this.scene);
    this.sampleBox.setParent(this.meshPlane);
    this.sampleBox.position = new Vector3(.12, 0, -.05);
    this.sampleBox.rotation.z = 0;
    this.sampleBox.isVisible = false;
    this.sampleBox.isPickable = false;

    this.sampleSphere = MeshBuilder.CreateSphere("this.sampleSphere", { diameter: .1 }, this.scene);
    this.sampleSphere.setParent(this.meshPlane);
    this.sampleSphere.position = new Vector3(0, 0, -.05);
    this.sampleSphere.isVisible = false;
    this.sampleSphere.isPickable = false;

    this.sampleCylinder = MeshBuilder.CreateCylinder("this.sampleCylinder",
      { height: .1, diameterTop: 0, diameterBottom: .1 }, this.scene);
    this.sampleCylinder.setParent(this.meshPlane);
    this.sampleCylinder.position = new Vector3(-.115, 0, -.05);
    this.sampleCylinder.rotation.z = 0;
    this.sampleCylinder.isVisible = false;
    this.sampleCylinder.isPickable = false;


    // Create a locomotion mode button
    var locoModeButton = new Button3D("locoModeButton");
    guiManager.addControl(locoModeButton);
    locoModeButton.scaling = new Vector3(.1, .05, .1);

    var locoModeButtonTransform = new TransformNode("locoModeButtonTransform", this.scene);
    locoModeButtonTransform.position = new Vector3(0, -.06, .005);
    locoModeButtonTransform.rotation = new Vector3(-10 * Math.PI / 180, 0, 0);
    locoModeButtonTransform.parent = this.controllerGuiTransform;
    locoModeButton.linkToTransformNode(locoModeButtonTransform);

    var locoModeButtonText = new TextBlock();
    locoModeButtonText.text = "Locomotion Mode";
    locoModeButtonText.color = "white";
    locoModeButtonText.fontSize = 12;
    locoModeButtonText.scaleX = 2;
    locoModeButtonText.scaleY = 4;
    locoModeButtonText.rotation = Math.PI;
    locoModeButton.content = locoModeButtonText;

    this.configPlane = MeshBuilder.CreatePlane("configPlane",
      { width: 0.26, height: 0.23 }, this.scene);
    this.configPlaneTransform = new TransformNode("configPlaneTransform");
    this.configPlaneTransform.position = new Vector3(0, -.25, 0);
    this.configPlaneTransform.rotation = new Vector3(150 * Math.PI / 180, Math.PI, 0);
    this.configPlane.parent = this.configPlaneTransform;
    this.configPlaneTransform.parent = this.controllerGuiTransform;
    this.configPlane.isVisible = false;
    this.configPlane.isPickable = false;

    var configTexture = AdvancedDynamicTexture.CreateForMesh(this.configPlane, 260, 230);
    configTexture.background = (new Color4(.5, .5, .5, .75)).toHexString();

    // Create a stack panel for the radio buttons
    var locoModePanel = new StackPanel("locoModePanel");
    locoModePanel.widthInPixels = 250;
    locoModePanel.isVertical = true;
    locoModePanel.paddingLeftInPixels = 10;
    locoModePanel.paddingTopInPixels = 10;
    locoModePanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
    locoModePanel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;

    configTexture.addControl(locoModePanel);

    var locoModeRadio1 = new RadioButton("locoModeRadio1");
    locoModeRadio1.isChecked = true;
    locoModeRadio1.width = "20px";
    locoModeRadio1.height = "20px";
    locoModeRadio1.color = "white";
    locoModeRadio1.background = "black";

    var locoModeRadio2 = new RadioButton("locoModeRadio2");
    locoModeRadio2.width = "20px";
    locoModeRadio2.height = "20px";
    locoModeRadio2.color = "white";
    locoModeRadio2.background = "black";

    var locoModeRadio3 = new RadioButton("locoModeRadio3");
    locoModeRadio3.width = "20px";
    locoModeRadio3.height = "20px";
    locoModeRadio3.color = "white";
    locoModeRadio3.background = "black";

    var locoModeRadio4 = new RadioButton("locoModeRadio4");
    locoModeRadio4.width = "20px";
    locoModeRadio4.height = "20px";
    locoModeRadio4.color = "white";
    locoModeRadio4.background = "black";

    var flyModeCheckbox = new Checkbox("flyModeCheckbox");
    flyModeCheckbox.width = "20px";
    flyModeCheckbox.height = "20px";
    flyModeCheckbox.color = "white";
    flyModeCheckbox.background = "black";
    flyModeCheckbox.isChecked = false;

    var moveSpeedSlider = new Slider("moveSpeedSlider");
    moveSpeedSlider.width = "240px";
    moveSpeedSlider.height = "24px";
    moveSpeedSlider.color = "white";
    moveSpeedSlider.background = "black";
    moveSpeedSlider.minimum = .5;
    moveSpeedSlider.maximum = 10;
    moveSpeedSlider.value = this.moveSpeed;
    moveSpeedSlider.paddingTopInPixels = 5;

    // Text headers for the radio buttons
    var locoModeRadio1Header = Control.AddHeader(locoModeRadio1, "View directed move", "230px",
      { isHorizontal: true, controlFirst: true });
    locoModeRadio1Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio1Header.height = "30px";
    locoModeRadio1Header.fontSize = "20px";
    locoModeRadio1Header.color = "white";
    locoModePanel.addControl(locoModeRadio1Header);

    var locoModeRadio2Header = Control.AddHeader(locoModeRadio2, "Hand directed move", "230px",
      { isHorizontal: true, controlFirst: true });
    locoModeRadio2Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio2Header.height = "30px";
    locoModeRadio2Header.fontSize = "20px";
    locoModeRadio2Header.color = "white";
    locoModePanel.addControl(locoModeRadio2Header);

    var locoModeRadio3Header = Control.AddHeader(locoModeRadio3, "Directed teleportation", "230px",
      { isHorizontal: true, controlFirst: true });
    locoModeRadio3Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio3Header.height = "30px";
    locoModeRadio3Header.fontSize = "20px";
    locoModeRadio3Header.color = "white";
    locoModePanel.addControl(locoModeRadio3Header);

    var locoModeRadio4Header = Control.AddHeader(locoModeRadio4, "Visualized teleportation",
      "230px", { isHorizontal: true, controlFirst: true });
    locoModeRadio4Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio4Header.height = "30px";
    locoModeRadio4Header.fontSize = "20px";
    locoModeRadio4Header.color = "white";
    locoModePanel.addControl(locoModeRadio4Header);

    var flyModeCheckboxHeader = Control.AddHeader(flyModeCheckbox, "Fly mode", "230px",
      { isHorizontal: true, controlFirst: true });
    flyModeCheckboxHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    flyModeCheckboxHeader.height = "30px";
    flyModeCheckboxHeader.fontSize = "20px";
    flyModeCheckboxHeader.color = "white";
    locoModePanel.addControl(flyModeCheckboxHeader);

    var moveSpeedSliderHeader = Control.AddHeader(moveSpeedSlider,
      "Move speed: " + this.moveSpeed.toFixed(1).toString() + "m/s", "28px",
      { isHorizontal: false, controlFirst: false });
    moveSpeedSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    moveSpeedSliderHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
    moveSpeedSliderHeader.paddingTopInPixels = 5;
    moveSpeedSliderHeader.fontSize = "20px";
    moveSpeedSliderHeader.color = "white";
    var text = <TextBlock>moveSpeedSliderHeader.getChildByName("header");
    text.paddingLeftInPixels = 15;
    locoModePanel.addControl(moveSpeedSliderHeader);

    locoModeButton.onPointerDownObservable.add(() => {
      if (this.openedConfigPlane) {
        this.configPlane!.isVisible = false;
        this.configPlane!.isPickable = false;
        if (this.configPlane!.parent == this.xrCamera) {
          this.configPlane!.parent = this.configPlaneTransform;
          this.configPlane!.position = new Vector3(0, 0, 0);
          this.configPlane!.rotation = new Vector3(0, 0, 0);
        }
      } else {
        this.configPlane!.isVisible = true;
        this.configPlane!.isPickable = true;
        if (this.meshPlane!.parent != this.xrCamera) {
          this.meshPlane!.isVisible = false;
          this.meshPlane!.isPickable = false;
          this.sampleBox!.isVisible = false;
          this.sampleBox!.isPickable = false;
          this.sampleSphere!.isVisible = false;
          this.sampleSphere!.isPickable = false;
          this.sampleCylinder!.isVisible = false;
          this.sampleCylinder!.isPickable = false;
          this.openedMeshPlane = false;
        }
        if (this.notepadPlane!.parent != this.xrCamera) {
          this.notepadPlane!.isVisible = false;
          this.notepadPlane!.isPickable = false;
          this.openedNotepadPlane = false;
        }
        if (this.boardPlane!.parent != this.xrCamera) {
          this.boardPlane!.isVisible = false;
          this.boardPlane!.isPickable = false;
          this.openedBoardPlane = false;
        }
      }
      this.openedConfigPlane = !this.openedConfigPlane;
    });

    // Event handlers for the radio buttons
    locoModeRadio1.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 0;
      }
    });

    locoModeRadio2.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 1;
      }
    });

    locoModeRadio3.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 2;
      }
    });

    locoModeRadio4.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 3;
      }
    });

    flyModeCheckbox.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.flyMode = true;
      } else {
        this.flyMode = false;
      }
    });

    // Anlan 12122020
    mapModeButton.onPointerDownObservable.add(() => {
      if(this.mapMode == true) {
        // resume the original position
        this.world!.position.x = this.worldOriginalPosition.x;
        this.world!.position.y = this.worldOriginalPosition.y;
        this.world!.position.z = this.worldOriginalPosition.z;
        this.xrCamera!.position.x = this.cameraOriginalPosition.x;
        this.xrCamera!.position.y = this.cameraOriginalPosition.y;
        this.xrCamera!.position.z = this.cameraOriginalPosition.z;

        // resume original fly mode and locomotion mode
        this.flyMode = this.originalFlyMode;
        flyModeCheckbox.isChecked = this.flyMode;
        this.locomotionMode = this.originalLocomotionMode;
        switch (this.locomotionMode) {
          case 0:
            locoModeRadio1.isChecked = true;
            break;
          case 1:
            locoModeRadio2.isChecked = true;
            break;
          case 2:
            locoModeRadio3.isChecked = true;
            break;
          case 3:
            locoModeRadio4.isChecked = true;
            break;
          default:
            break;
        }
        this.mapMode = false;
      } else {
        // save the original position
        this.worldOriginalPosition.x = this.world!.position.x;
        this.worldOriginalPosition.y = this.world!.position.y;
        this.worldOriginalPosition.z = this.world!.position.z;
        this.cameraOriginalPosition.x = this.xrCamera!.position.x;
        this.cameraOriginalPosition.y = this.xrCamera!.position.y;
        this.cameraOriginalPosition.z = this.xrCamera!.position.z;
        this.world!.position.y -= 20;

        // save original fly and locomotion mode,
        // set fly mode as true and set locomotion mode as visualizedtele
        this.originalLocomotionMode = this.locomotionMode;
        this.originalFlyMode = this.flyMode;
        flyModeCheckbox.isChecked = true;
        this.flyMode = true;
        this.locomotionMode = LocomotionMode.visualizedTele;
        locoModeRadio4.isChecked = true;

        this.mapMode = true;
      }
    });

    moveSpeedSlider.onValueChangedObservable.add((value) => {
      var text = <TextBlock>moveSpeedSliderHeader.getChildByName("header");
      this.moveSpeed = value;
      text.text = "Move speed: " + this.moveSpeed.toFixed(1).toString() + "m/s", "230px";
    });

    // Create a colorpicker
    this.picker = new ColorPicker();
    this.pickerPlane = MeshBuilder.CreatePlane(
      "pickerPlane", { width: .3, height: .3 }, this.scene);
    var pickerTexture = AdvancedDynamicTexture.CreateForMesh(this.pickerPlane, 500, 500);
    pickerTexture.addControl(this.picker);

    var pickerPlaneTransform = new TransformNode("pickerPlaneTransform", this.scene);
    pickerPlaneTransform.position = new Vector3(-.13, 0, 0);
    pickerPlaneTransform.parent = this.controllerGuiTransform;
    this.pickerPlane.parent = pickerPlaneTransform;
    this.pickerPlane.isPickable = false;
    this.pickerPlane.visibility = 0;

    // Exclude planes from highlight layer so they won't glow when intersect
    this.highlight.addExcludedMesh(this.pickerPlane);
    this.highlight.addExcludedMesh(this.configPlane);
    this.highlight.addExcludedMesh(this.notepadPlane);
    this.highlight.addExcludedMesh(this.boardPlane);
    this.highlight.addExcludedMesh(this.meshPlane);

    // Attach the laser pointer to the right controller when it is connected
    xrHelper.input.onControllerAddedObservable.add((inputSource) => {
      if (inputSource.uniqueId.endsWith("right")) {
        this.rightController = inputSource;
      } else {
        this.leftController = inputSource;
        this.controllerGuiTransform!.parent = this.leftController.pointer!;
      }
    });

    // Don't forget to deparent objects from the controllers or they will be destroyed!
    xrHelper.input.onControllerRemovedObservable.add((inputSource) => {
      if (inputSource.uniqueId.endsWith("left")) {
        this.controllerGuiTransform!.parent = null;
      }
    });
  }

  private processPointer(pointerInfo: PointerInfo) {
    const that = this;
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
        if (pointerInfo.pickInfo?.hit) {
          console.log("selected mesh: " + pointerInfo.pickInfo.pickedMesh?.name);
          if (pointerInfo.pickInfo.pickedMesh?.name.includes("picker")) {
          } else if (pointerInfo.pickInfo.pickedMesh?.name.startsWith("sptp") &&
            !(pointerInfo.pickInfo.pickedMesh?.name.includes("concrete") ||
              pointerInfo.pickInfo.pickedMesh?.name.includes("segment") ||
              pointerInfo.pickInfo.pickedMesh?.name.includes("grass"))) {
            this.selectedInstancedMesh = null;
            this.selectedMesh = null;
            this.selectedMaterial = null;
            this.highlight.removeAllMeshes();
            this.pickerPlane!.visibility = 1;
            this.pickerPlane!.isPickable = true;
            this.picker!.onValueChangedObservable.clear();
            if (pointerInfo!.pickInfo!.pickedMesh instanceof InstancedMesh) {
              this.selectedInstancedMesh = <InstancedMesh>pointerInfo.pickInfo.pickedMesh;
              this.selectedMaterial = <StandardMaterial>this.selectedInstancedMesh.
                sourceMesh.material!.clone("selectedMaterial");
              console.log("instanced. material: " + this.selectedMaterial!.emissiveColor);
              this.highlight.addMesh(this.selectedInstancedMesh.sourceMesh, Color3.White());
              this.picker!.value = this.selectedMaterial.emissiveColor;
              this.picker!.onValueChangedObservable.add(function (color) {
                that.selectedMaterial!.emissiveColor.copyFrom(color);
                that.selectedInstancedMesh!.sourceMesh.material = that.selectedMaterial;
              });
            } else {
              this.selectedMesh = <Mesh>pointerInfo.pickInfo.pickedMesh;
              this.selectedMaterial = <StandardMaterial>this.selectedMesh.material!.
                clone("selectedMaterial");
              console.log("mesh. material: " + this.selectedMaterial!.emissiveColor);
              this.highlight.addMesh(this.selectedMesh, Color3.White());
              this.picker!.value = this.selectedMaterial.emissiveColor;
              this.picker!.onValueChangedObservable.add(function (color) {
                that.selectedMaterial!.emissiveColor.copyFrom(color);
                that.selectedMesh!.material = that.selectedMaterial;
              });
            }
          } else if (pointerInfo.pickInfo.pickedMesh?.name.startsWith("new")) {
            this.selectedInstancedMesh = null;
            this.selectedMesh = null;
            this.selectedMaterial = null;
            this.highlight.removeAllMeshes();
            this.pickerPlane!.visibility = 1;
            this.pickerPlane!.isPickable = true;
            this.picker!.onValueChangedObservable.clear();
            this.selectedMesh = <Mesh>pointerInfo.pickInfo.pickedMesh;
            if (!this.selectedMesh.material) {
              this.selectedMaterial = new StandardMaterial("newMaterial", this.scene);
              this.selectedMesh.material = this.selectedMaterial;
            } else {
              this.selectedMaterial = <StandardMaterial>this.selectedMesh.material!.
                clone("selectedMaterial");
            }
            console.log("mesh. material: " + this.selectedMaterial!.diffuseColor);
            this.highlight.addMesh(this.selectedMesh, Color3.White());
            this.picker!.value = this.selectedMaterial.diffuseColor;
            this.picker!.onValueChangedObservable.add(function (color) {
              that.selectedMaterial!.diffuseColor.copyFrom(color);
              that.selectedMesh!.material = that.selectedMaterial;
            });
          } else {
            this.selectedInstancedMesh = null;
            this.selectedMesh = null;
            this.selectedMaterial = null;
            this.highlight.removeAllMeshes();
            this.pickerPlane!.visibility = 0;
            this.pickerPlane!.isPickable = false;
            this.picker!.onValueChangedObservable.clear();
          }
        } else {
          this.selectedInstancedMesh = null;
          this.selectedMesh = null;
          this.selectedMaterial = null;
          this.highlight.removeAllMeshes();
          this.pickerPlane!.visibility = 0;
          this.pickerPlane!.isPickable = false;
          this.picker!.onValueChangedObservable.clear();
        }
      break;
    }
  }

  // The main update loop will be executed once per frame before the scene is rendered
  private update(): void {
    // Polling for controller input
    this.processControllerInput();
  }

  // Process event handlers for controller input
  private processControllerInput() {
    this.onLeftControllerMove(this.xrCamera!, this.leftController?.pointer);
    this.onRightThumbstick(this.rightController?.motionController?.
      getComponent("xr-standard-thumbstick"));
    this.onLeftThumbStick(this.leftController?.motionController?.
      getComponent("xr-standard-thumbstick"));
    this.onLeftSqueeze(this.leftController?.motionController?.
      getComponent("xr-standard-squeeze"));
    this.onRightSqueeze(this.rightController?.motionController?.
      getComponent("xr-standard-squeeze"));
  }

  // Grab an object when grip
  private onRightSqueeze(component?: WebXRControllerComponent) {
    if (component?.changes.pressed) {
      if (component.pressed && !this.holding) {
        if (this.rightController!.grip!.intersectsMesh(<AbstractMesh>this.sampleBox, true)) {
          var newBox = MeshBuilder.CreateBox("newBox", { size: .3 }, this.scene);
          newBox.rotation = this.sampleBox!.rotation.clone();
          newBox.parent = this.rightController!.grip!;
          this.holding = newBox;
        } else if (this.rightController!.grip!.intersectsMesh
          (<AbstractMesh>this.sampleSphere, true)) {
          var newSphere = MeshBuilder.CreateSphere("newSphere", { diameter: .3 }, this.scene);
          newSphere.parent = this.rightController!.grip!;
          this.holding = newSphere;
        } else if (this.rightController!.grip!.intersectsMesh
          (<AbstractMesh>this.sampleCylinder, true)) {
          var newCylinder = MeshBuilder.CreateCylinder("newCylinder",
            { height: .3, diameterTop: 0, diameterBottom: .3 }, this.scene);
          newCylinder.rotation = this.sampleCylinder!.rotation.clone();
          newCylinder.rotation.z += Math.PI / 2;
          newCylinder.parent = this.rightController!.grip!;
          this.holding = newCylinder;
        } else if (this.rightController!.grip!.intersectsMesh(<AbstractMesh>this.boardPlane) &&
          this.openedBoardPlane) {
          this.boardPlane!.setParent(this.rightController!.grip!);
          this.holding = this.boardPlane!;
        } else if (this.rightController!.grip!.intersectsMesh(<AbstractMesh>this.meshPlane)
          && this.openedMeshPlane) {
          this.meshPlane!.setParent(this.rightController!.grip!);
          this.holding = this.meshPlane!;
        } else if (this.rightController!.grip!.intersectsMesh(<AbstractMesh>this.configPlane)
          && this.openedConfigPlane) {
          this.configPlane!.setParent(this.rightController!.grip!);
          this.holding = this.configPlane!;
        } else if (this.rightController!.grip!.intersectsMesh(<AbstractMesh>this.notepadPlane)
          && this.openedNotepadPlane) {
          this.notepadPlane!.setParent(this.rightController!.grip!);
          this.holding = this.notepadPlane!;
        } else if (this.savedMesh) {
          for (var i = 0; i < this.savedMesh!.length && !this.holding; i++) {
            if (this.rightController!.grip!.intersectsMesh(this.savedMesh![i], true)) {
              this.holding = this.savedMesh![i];
              this.holding.setParent(this.rightController!.grip!);
            }
          }
        }
      } else {
        if (this.holding) {
          console.log(this.holding);
          if (this.holding.name.includes("new")) {
            console.log("unlock mesh");
            this.holding.setParent(null);
            this.savedMesh?.push(this.holding);
            this.holding = null;
          } else if (this.holding.name.includes("Plane")) {
            console.log("unlock plane");
            this.holding.setParent(this.xrCamera);
            this.savedMesh?.push(this.holding);
            this.holding = null;
          }
        }
      }
    }
  }

  // Menu shows up and resets when left squeeze button is hold
  private onLeftSqueeze(component?: WebXRControllerComponent) {
    if (component?.pressed) {
      this.pickerPlane!.visibility = 1;
      this.pickerPlane!.isPickable = true;
      this.controllerGuiTransform?.getChildMeshes().forEach((mesh) => {
        mesh.visibility = 1;
        mesh.isPickable = true;
      });
      if (this.selectedMaterial == null) {
        this.pickerPlane!.visibility = 0;
        this.pickerPlane!.isPickable = false;
      }
      this.openedBoardPlane = false;
      this.openedConfigPlane = false;
      this.openedMeshPlane = false;
      this.openedNotepadPlane = false;
      this.meshPlane!.isVisible = false;
      this.meshPlane!.isPickable = false;
      this.sampleBox!.isVisible = false;
      this.sampleBox!.isPickable = false;
      this.sampleSphere!.isVisible = false;
      this.sampleSphere!.isPickable = false;
      this.sampleCylinder!.isVisible = false;
      this.sampleCylinder!.isPickable = false;
      this.configPlane!.isVisible = false;
      this.configPlane!.isPickable = false;
      this.notepadPlane!.isVisible = false;
      this.notepadPlane!.isPickable = false;
      this.boardPlane!.isVisible = false;
      this.boardPlane!.isPickable = false;
      this.meshPlane!.parent = this.meshPlaneTransform;
      this.configPlane!.parent = this.configPlaneTransform;
      this.boardPlane!.parent = this.boardPlaneTransform;
      this.notepadPlane!.parent = this.notepadPlaneTransform;
      this.meshPlane!.position = new Vector3(0, 0, 0);
      this.configPlane!.position = new Vector3(0, 0, 0);
      this.boardPlane!.position = new Vector3(0, 0, 0);
      this.notepadPlane!.position = new Vector3(0, 0, 0);
      this.meshPlane!.rotation = new Vector3(0, 0, 0);
      this.configPlane!.rotation = new Vector3(0, 0, 0);
      this.boardPlane!.rotation = new Vector3(0, 0, 0);
      this.notepadPlane!.rotation = new Vector3(0, 0, 0);
    }
  }

  // Menu shows up when user raises their left arm
  // This could be done by more accurate calculations,
  // but was implemented in a easy method due to time constrains.
  private onLeftControllerMove(camera: WebXRCamera, controller?: AbstractMesh) {
    if (camera != null && controller != null) {
      if (camera.position.y - controller.position.y > .65 ||
        camera.position.y - controller.position.y < -.5 ||
        camera.position.subtract(controller.position).length() > .8) {
        this.pickerPlane!.visibility = 0;
        this.pickerPlane!.isPickable = false;
        this.controllerGuiTransform?.getChildMeshes().forEach((mesh) => {
          mesh.visibility = 0;
          mesh.isPickable = false;
        });
        if (this.selectedMaterial == null) {
          this.pickerPlane!.visibility = 0;
          this.pickerPlane!.isPickable = false;
        }
      } else {
        this.pickerPlane!.visibility = 1;
        this.pickerPlane!.isPickable = true;
        this.controllerGuiTransform?.getChildMeshes().forEach((mesh) => {
          mesh.visibility = 1;
          mesh.isPickable = true;
        });
        if (this.selectedMaterial == null) {
          this.pickerPlane!.visibility = 0;
          this.pickerPlane!.isPickable = false;
        }
      }
    }
  }

  private onRightThumbstick(component?: WebXRControllerComponent) {
    if (component?.changes.axes) {
      if (this.mapMode == false) {
        // View-directed steering
        if (this.locomotionMode == LocomotionMode.viewDirected) {
          // Get the current camera direction
          var directionVector = this.xrCamera!.getDirection(Axis.Z);

          if (!this.flyMode) {
            directionVector.y = 0;
            directionVector = directionVector.normalizeToNew();
          }

          // Use delta time to calculate the move distance based on speed of 3 m/sec
          var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000)
            * this.moveSpeed;

          // Translate the camera forward
          this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

          // Snap turn
          var turnAngle = 20;
          if (component.axes.x > .8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if (component.axes.x < -.8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, -turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if ((component.axes.x <= .5 && component.axes.x >= -.5) && this.turned) {
            this.turned = false;
          }
        } else if (this.locomotionMode == LocomotionMode.handDirected) {
          // Get the current hand direction
          var directionVector = this.rightController!.pointer.forward;

          if (!this.flyMode) {
            directionVector.y = 0;
            directionVector = directionVector.normalizeToNew();
          }

          // Use delta time to calculate the move distance based on speed of 3 m/sec
          var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000)
            * this.moveSpeed;

          // Translate the camera forward
          this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

          // Snap turn
          var turnAngle = 20;
          if (component.axes.x > .8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if (component.axes.x < -.8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, -turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if ((component.axes.x <= .5 && component.axes.x >= -.5) && this.turned) {
            this.turned = false;
          }
        } else if (this.locomotionMode == LocomotionMode.teleportation) {  // Teleportation
          // If the thumbstick is moved forward
          if (component.axes.y < -.75) {
            // Create a new ray cast
            var ray = new Ray(this.rightController!.pointer.position,
              this.rightController!.pointer.forward, 20);
            var pickInfo = this.scene.pickWithRay(ray);

            // If the ray cast intersected a ground mesh
            if (pickInfo?.hit && this.groundMeshes.includes(pickInfo.pickedMesh!)) {
              this.teleportPoint = pickInfo.pickedPoint;
              this.teleportBox!.visibility = 1;
              var rotation = this.xrCamera!.getDirection(Axis.Z);
              rotation.y = 0;
              this.teleportBox!.lookAt(this.teleportBox!.position.add(rotation));
              this.teleportBox!.rotate(Axis.Y,
                -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!);
              this.teleportBox!.position = this.teleportPoint!.add(new Vector3(0, .2, 0));
            } else {
              this.teleportPoint = null;
              this.teleportBox!.visibility = 0;
            }
          } else if (component.axes.y == 0) {  // If thumbstick returns to the rest position
            this.teleportBox!.visibility = 0;

            // If we have a valid targer point, then teleport the user
            if (this.teleportPoint) {
              this.xrCamera!.position.x = this.teleportPoint.x;
              this.xrCamera!.position.y = this.teleportPoint.y + this.xrCamera!.realWorldHeight;
              this.xrCamera!.position.z = this.teleportPoint.z;
              this.teleportPoint = null;
              var cameraRotation = Quaternion.FromEulerAngles
                (0, -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!, 0);
              this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }
          }
        } else {  // Visualized Teleportation
          // If the thumbstick is moved forward
          if (component.axes.y < -.75) {
            // Create a new ray cast
            var ray = new Ray(this.rightController!.pointer.position,
              this.rightController!.pointer.forward, 20);
            var pickInfo = this.scene.pickWithRay(ray);

            // If the ray cast intersected a ground mesh
            if (pickInfo?.hit && this.groundMeshes.includes(pickInfo.pickedMesh!)) {
              this.teleportPoint = pickInfo.pickedPoint;
              this.workspaceBox!.visibility = 1;
              this.workspaceUser!.visibility = 1;
              this.workspaceBox!.position = this.teleportPoint!.add(new Vector3(0, 1.5, 0));
              var userPos = this.xrSessionManager!.currentFrame?.
                getViewerPose(this.xrSessionManager!.baseReferenceSpace)?.transform.position;
              this.workspaceUser!.position = this.teleportPoint!.add
                (new Vector3(userPos?.x, .2, userPos?.z));
              var userOri = this.xrSessionManager!.currentFrame?.getViewerPose
                (this.xrSessionManager!.baseReferenceSpace)?.transform.orientation;
              var userOriVec = new Quaternion(userOri?.x, userOri?.y, userOri?.z, userOri?.w).
                toEulerAngles();
              this.workspaceUser!.rotation = userOriVec.multiply(new Vector3(0, 1, 0));
            } else {
              this.teleportPoint = null;
              this.workspaceBox!.visibility = 0;
              this.workspaceUser!.visibility = 0;
            }
          } else if (component.axes.y == 0) {  // If thumbstick returns to the rest position
            this.workspaceBox!.visibility = 0;
            this.workspaceUser!.visibility = 0;

            // If we have a valid targer point, then teleport the user
            if (this.teleportPoint) {
              this.xrCamera!.position.x = this.teleportPoint.x;
              this.xrCamera!.position.y = this.teleportPoint.y + this.xrCamera!.realWorldHeight;
              this.xrCamera!.position.z = this.teleportPoint.z;
              this.teleportPoint = null;
              var cameraRotation = Quaternion.FromEulerAngles
                (0, -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!, 0);
              this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }
          }
        }
      }
      else {
        // Anlan 12122020
        // Visualized Teleportation
        // If the thumbstick is moved forward
        if (component.axes.y < -.75) {
          // Create a new ray cast
          var ray = new Ray(this.rightController!.pointer.position,
            this.rightController!.pointer.forward, 100);
          var pickInfo = this.scene.pickWithRay(ray);

          // If the ray cast intersected a ground mesh
          if (pickInfo?.hit && this.groundMeshes.includes(pickInfo.pickedMesh!)) {
            this.teleportPoint = pickInfo.pickedPoint;
            this.workspaceBox!.visibility = 1;
            this.workspaceUser!.visibility = 1;
            this.workspaceBox!.position = this.teleportPoint!.add(new Vector3(0, 1.5, 0));
            var userPos = this.xrSessionManager!.currentFrame?.
              getViewerPose(this.xrSessionManager!.baseReferenceSpace)?.transform.position;
            this.workspaceUser!.position = this.teleportPoint!.add
              (new Vector3(userPos?.x, .2, userPos?.z));
            var userOri = this.xrSessionManager!.currentFrame?.
              getViewerPose(this.xrSessionManager!.baseReferenceSpace)?.transform.orientation;
            var userOriVec = new Quaternion(userOri?.x, userOri?.y, userOri?.z, userOri?.w).
              toEulerAngles();
            this.workspaceUser!.rotation = userOriVec.multiply(new Vector3(0, 1, 0));
          } else {
            this.teleportPoint = null;
            this.workspaceBox!.visibility = 0;
            this.workspaceUser!.visibility = 0;
          }
        } else if (component.axes.y == 0) {  // If thumbstick returns to the rest position
          this.workspaceBox!.visibility = 0;
          this.workspaceUser!.visibility = 0;

          // If we have a valid targer point, then teleport the user
          if (this.teleportPoint) {
            this.xrCamera!.position.x = this.teleportPoint.x + this.worldOriginalPosition.x
              - this.world!.position.x;
            this.xrCamera!.position.y = this.teleportPoint.y + this.xrCamera!.realWorldHeight
              + this.worldOriginalPosition.y - this.world!.position.y;
            this.xrCamera!.position.z = this.teleportPoint.z +
              this.worldOriginalPosition.z - this.world!.position.z;
            this.teleportPoint = null;
            var cameraRotation = Quaternion.FromEulerAngles
              (0, -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);

            // resume the original position
            this.world!.position.x = this.worldOriginalPosition.x;
            this.world!.position.y = this.worldOriginalPosition.y;
            this.world!.position.z = this.worldOriginalPosition.z;

            // resume original fly mode and locomotion mode
            this.flyMode = this.originalFlyMode;
            this.locomotionMode = this.originalLocomotionMode;

            // exit map mode
            this.mapMode = false;
          }
        }
      }
    }
  }

  // Anlan 12122020
  // Map Zoom in/out
  private onLeftThumbStick(component?: WebXRControllerComponent) {
    if (component?.changes.axes) {
      if (this.mapMode == true) {
        // View-directed steering
        // Get the current camera direction
        var directionVector = this.xrCamera!.getDirection(Axis.Z);

        if (!this.flyMode) {
          directionVector.y = 0;
          directionVector = directionVector.normalizeToNew();
        }

        // Use delta time to calculate the move distance based on speed of 10 m/sec for zoom in/out
        var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 10;

        // Translate the camera forward
        this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

        // Snap turn
        var turnAngle = 20;
        if (component.axes.x > .8 && !this.turned) {
          this.turned = true;
          var cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
          this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
        } else if (component.axes.x < -.8 && !this.turned) {
          this.turned = true;
          var cameraRotation = Quaternion.FromEulerAngles(0, -turnAngle * Math.PI / 180, 0);
          this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
        } else if ((component.axes.x <= .5 && component.axes.x >= -.5) && this.turned) {
          this.turned = false;
        }
      }
    }
  }
}
/******* End of the Game class ******/

// start the game
var game = new Game();
game.start();
