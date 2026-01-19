figma.showUI(__html__, { width: 320, height: 320 });

function isVisible(node) {
    return "visible" in node ? node.visible : true;
}

function simpleTypeTag(node) {
    switch (node.type) {
        case "TEXT": return "text";
        case "GROUP": return "group";
        case "COMPONENT": return "component";
        case "COMPONENT_SET": return "component-set";
        case "INSTANCE": return "instance";
        case "FRAME": return "frame";
        case "SECTION": return "section";
        case "RECTANGLE":
        case "ELLIPSE":
        case "LINE":
        case "POLYGON":
        case "STAR":
        case "VECTOR":
            return "shape";
        default:
            return String(node.type || "").toLowerCase();
    }
}

function hasAutoLayout(node) {
    return ("layoutMode" in node) && node.layoutMode && node.layoutMode !== "NONE";
}

function formatComponentProps(instance) {
    var props;
    try {
        props = instance.componentProperties;
    } catch (e) {
        return " {props:error}";
    }
    if (!props) return "";

    var parts = [];
    for (var propName in props) {
        if (!Object.prototype.hasOwnProperty.call(props, propName)) continue;
        var meta = props[propName] || {};
        var v = meta.value;

        if (typeof v === "string") v = '"' + v + '"';
        else if (v && typeof v === "object") {
            try { v = JSON.stringify(v); } catch (e2) { v = "[object]"; }
        }
        parts.push(propName + "=" + v);
    }

    return parts.length ? " {" + parts.join(", ") + "}" : "";
}

function formatMainComponentName(instance) {
    try {
        var main = instance.mainComponent;
        if (!main) return "";
        return " <" + main.name + ">";
    } catch (e) {
        return "";
    }
}

function tagFor(node) {
    var tags = [];
    tags.push("[" + simpleTypeTag(node) + "]");
    if (hasAutoLayout(node)) tags.push("[autolayout]");
    if (!isVisible(node)) tags.push("[hidden]");

    if (node.type === "INSTANCE") {
        tags.push(formatMainComponentName(node)); // optional
        tags.push(formatComponentProps(node));
    }

    return tags.join("");
}

function nameFor(node) {
    var n = (node.name || "").trim();
    return n || "(unnamed)";
}

function isContainer(node) {
    return "children" in node && Array.isArray(node.children);
}

function renderTree(node, depth) {
    if (depth == null) depth = 0;

    var indent = "  ".repeat(depth);
    var line = (indent + "- " + nameFor(node) + " " + tagFor(node)).trimEnd();
    var lines = [line];

    if (isContainer(node)) {
        for (var i = 0; i < node.children.length; i++) {
            lines.push(renderTree(node.children[i], depth + 1));
        }
    }

    return lines.join("\n");
}

function renderFromSelectionOrPage() {
    var sel = figma.currentPage.selection;
    var roots = sel.length ? sel : [figma.currentPage];
    return roots.map(function (n) { return renderTree(n, 0); }).join("\n\n");
}

function sendRender() {
    figma.ui.postMessage({ type: "render", text: renderFromSelectionOrPage() });
}

// render once on open (optional). Remove if you want blank until Preview.
sendRender();

figma.ui.onmessage = function (msg) {
    if (msg.type === "preview") sendRender();
    if (msg.type === "close") figma.closePlugin();
};