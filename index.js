const {
  MessageActionRow,
  Message,
  MessageEmbed,
  MessageButton,
  Interaction,
} = require("discord.js");

/**
 * Creates a pagination embed
 * @param {Interaction | Message} interaction
 * @param {MessageEmbed[]} pages
 * @param {MessageButton[]} buttonList
 * @param {number} timeout
 * @param {string} messageFooter
 * @returns
 */
const paginationEmbed = async (
  interaction,
  pages,
  buttonList,
  timeout = 120000,
  messageFooter,
) => {
  if (interaction instanceof Message) {
    if (!interaction && !interaction.channel) throw new Error("Channel is inaccessible.");
  }
  if (!pages) throw new Error("Pages are not given.");
  if (!buttonList) throw new Error("Buttons are not given.");
  if (buttonList[0].style === "LINK" || buttonList[1].style === "LINK")
    throw new Error(
      "Link buttons are not supported with discordjs-button-pagination"
    );
  if (buttonList.length !== 2) throw new Error("Need two buttons.");

  let page = 0;

  const row = new MessageActionRow().addComponents(buttonList);

  if (interaction instanceof Interaction) {
    //has the interaction already been deferred? If not, defer the reply.
    if (interaction.deferred == false) {
      await interaction.deferReply();
    }
    pages[page].footer = {text:`[Page ${page + 1} / ${pages.length}] ${messageFooter}`};
    var curPage = await interaction.editReply({
      embeds: [pages[page]],
      components: [row],
      fetchReply: true,
    });
  } else if (interaction instanceof Message) {
    var curPage = await interaction.reply({
      embeds: [pages[page]],
      components: [row],
    });
  }

  const filter = (i) =>
    i.customId === buttonList[0].customId ||
    i.customId === buttonList[1].customId;

  const collector = await curPage.createMessageComponentCollector({
    filter,
    time: timeout,
  });

  collector.on("collect", async (i) => {
    switch (i.customId) {
      case buttonList[0].customId:
        page = page > 0 ? --page : pages.length - 1;
        break;
      case buttonList[1].customId:
        page = page + 1 < pages.length ? ++page : 0;
        break;
      default:
        break;
    }
    await i.deferUpdate();
    pages[page].footer = {text:`[Page ${page + 1} / ${pages.length}] ${messageFooter}`};
    await i.editReply({
      embeds: [pages[page]],
      components: [row],
    });
    collector.resetTimer();
  });

  collector.on("end", (_, reason) => {
    if (reason !== "messageDelete" && reason !== "guildDelete") {
      const disabledRow = new MessageActionRow().addComponents(
        buttonList[0].setDisabled(true),
        buttonList[1].setDisabled(true)
      );
      pages[page].footer = {text:`[Page ${page + 1} / ${pages.length}] ${messageFooter}`};
      curPage.edit({
        embeds: [pages[page]],
        components: [disabledRow],
      });
    }
  });

  return curPage;
};
module.exports = paginationEmbed;